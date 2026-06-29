import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PLANS = {
  starter:  { name: 'Démarrage', xof: 2000,  stripePriceId: process.env.STRIPE_PRICE_STARTER },
  pro:      { name: 'Pro',       xof: 5000,  stripePriceId: process.env.STRIPE_PRICE_PRO },
  business: { name: 'Business',  xof: 12000, stripePriceId: process.env.STRIPE_PRICE_BUSINESS },
};

const subscriptions = {};

function activateSubscription(userId, plan, method) {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);
  subscriptions[userId] = { plan, active: true, expiry: expiry.toISOString(), paymentMethod: method };
  console.log('Abonnement activé :', userId, plan, method);
  return subscriptions[userId];
}

app.post('/api/stripe/create-checkout', async (req, res) => {
  const { planId, userId, userEmail } = req.body;
  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: 'Plan invalide' });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail || undefined,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { userId, planId },
      success_url: process.env.FRONTEND_URL + '/payment-success?method=stripe',
      cancel_url:  process.env.FRONTEND_URL + '/payment-cancel',
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/webhook/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send('Webhook Error: ' + err.message);
  }
  if (event.type === 'checkout.session.completed') {
    const { userId, planId } = event.data.object.metadata;
    activateSubscription(userId, planId, 'stripe');
  }
  res.json({ received: true });
});

app.post('/api/momo/request-payment', async (req, res) => {
  const { planId, userId, phoneNumber } = req.body;
  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: 'Plan invalide' });
  const msisdn = phoneNumber.replace(/^\+/, '').replace(/^00/, '');
  const referenceId = uuidv4();
  try {
    const credentials = Buffer.from(process.env.MOMO_API_USER + ':' + process.env.MOMO_API_KEY).toString('base64');
    const tokenRes = await axios.post('https://sandbox.momodeveloper.mtn.com/collection/token/', {}, {
      headers: { Authorization: 'Basic ' + credentials, 'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY, 'X-Target-Environment': 'sandbox' }
    });
    const token = tokenRes.data.access_token;
    await axios.post('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay', {
      amount: String(plan.xof), currency: 'EUR',
      externalId: 'VV-' + userId + '-' + Date.now(),
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: 'VenteVoix ' + plan.name,
      payeeNote: 'Activation ' + plan.name,
    }, {
      headers: {
        Authorization: 'Bearer ' + token,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      }
    });
    subscriptions['momo_pending_' + referenceId] = { userId, planId };
    res.json({ referenceId, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.get('/api/momo/status/:referenceId', async (req, res) => {
  const { referenceId } = req.params;
  try {
    const credentials = Buffer.from(process.env.MOMO_API_USER + ':' + process.env.MOMO_API_KEY).toString('base64');
    const tokenRes = await axios.post('https://sandbox.momodeveloper.mtn.com/collection/token/', {}, {
      headers: { Authorization: 'Basic ' + credentials, 'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY, 'X-Target-Environment': 'sandbox' }
    });
    const token = tokenRes.data.access_token;
    const r = await axios.get('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/' + referenceId, {
      headers: { Authorization: 'Bearer ' + token, 'X-Target-Environment': 'sandbox', 'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY }
    });
    if (r.data.status === 'SUCCESSFUL') {
      const pending = subscriptions['momo_pending_' + referenceId];
      if (pending) { activateSubscription(pending.userId, pending.planId, 'momo'); delete subscriptions['momo_pending_' + referenceId]; }
    }
    res.json({ status: r.data.status });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post('/api/wave/create-checkout', async (req, res) => {
  const { planId, userId } = req.body;
  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: 'Plan invalide' });
  try {
    const r = await axios.post('https://api.wave.com/v1/checkout/sessions', {
      currency: 'XOF', amount: String(plan.xof),
      error_url:   process.env.FRONTEND_URL + '/payment-cancel',
      success_url: process.env.FRONTEND_URL + '/payment-success?method=wave&userId=' + userId + '&plan=' + planId,
      client_reference: 'VV-' + userId + '-' + Date.now(),
    }, { headers: { Authorization: 'Bearer ' + process.env.WAVE_API_KEY, 'Content-Type': 'application/json' } });
    subscriptions['wave_pending_' + r.data.id] = { userId, planId };
    res.json({ url: r.data.wave_launch_url, sessionId: r.data.id });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.get('/api/wave/status/:sessionId', async (req, res) => {
  try {
    const r = await axios.get('https://api.wave.com/v1/checkout/sessions/' + req.params.sessionId,
      { headers: { Authorization: 'Bearer ' + process.env.WAVE_API_KEY } });
    if (r.data.payment_status === 'succeeded') {
      const pending = subscriptions['wave_pending_' + req.params.sessionId];
      if (pending) { activateSubscription(pending.userId, pending.planId, 'wave'); delete subscriptions['wave_pending_' + req.params.sessionId]; }
    }
    res.json({ status: r.data.payment_status });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.get('/api/subscription/:userId', (req, res) => {
  const sub = subscriptions[req.params.userId];
  if (!sub) return res.json({ active: false });
  const expired = new Date(sub.expiry) < new Date();
  res.json({ ...sub, active: sub.active && !expired });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('VenteVoix backend -> http://localhost:' + PORT));
