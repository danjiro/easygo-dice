const _ = require('lodash');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const assert = require('assert');
const { knex } = require('./knex');
const { redis } = require('./redis');

const parseSeed = (seed) => {
  if (!seed) {
    return null;
  }

  if (seed.active) {
    return _.omit(seed, ['secret']);
  }

  return seed;
};

exports.spinWheel = ({ user, amount }) =>
  knex.transaction(async (trx) => {
    assert(amount >= 0);

    const segments = [1.5, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 0, 0];

    let [seed] = await trx('wheel_seed').where({ user, active: true }).forUpdate();

    if (!seed) {
      const secret = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(secret).digest('hex');

      [seed] = await trx('wheel_seed')
        .insert({ id: uuid(), user, secret, hash, nonce: 0, active: true })
        .returning('*');
    }

    const nonce = String(seed.nonce + 1);

    const hmac = crypto
      .createHmac('sha256', seed.secret)
      .update(nonce)
      .digest('hex');

    // we take the first 32 bits (4 bytes, 8 hex chars)
    const int = parseInt(hmac.substr(0, 8), 16);
    const float = int / 2 ** 32;

    const result = Math.floor(float * 10);
    const payout = segments[result] * amount;
    const [bet] = await trx('wheel_bet')
      .insert({
        id: uuid(),
        seed_id: seed.id,
        user,
        amount,
        payout,
        result: segments[result],
        nonce,
      })
      .returning('*');

    await trx('wheel_seed')
      .update('nonce', trx.raw('nonce + 1'))
      .where('id', seed.id);

    await redis.publish('wheel', JSON.stringify(bet));

    return bet;
  });

exports.getBets = async ({ user, limit, offset }) => {
  const bets = await knex('wheel_bet')
    .where('wheel_bet.user', user)
    .join('wheel_seed', 'wheel_seed.id', '=', 'wheel_bet.seed_id')
    .orderBy('wheel_bet.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return bets.map((bet) => _.omit(bet, ['secret']));
};

exports.getSeed = async ({ seedId }) => {
  const [seed] = await knex('wheel_seed').where('id', seedId);

  return parseSeed(seed);
};

exports.rotateSeed = async ({ user }) => {
  await knex('wheel_seed')
    .update({ active: false })
    .where({ user, active: true })
    .returning('*');

  const secret = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(secret).digest('hex');

  const [seed] = await knex('wheel_seed')
    .insert({ id: uuid(), user, secret, hash, nonce: 0, active: true })
    .returning('*');

  return parseSeed(seed);
};

exports.getActiveSeed = async ({ user }) => {
  const [seed] = await knex('wheel_seed').where({ user, active: true });

  return parseSeed(seed);
};
