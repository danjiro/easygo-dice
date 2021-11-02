const express = require('express');
const bodyParser = require('body-parser');
const { knex } = require('./knex');
const { redis } = require('./redis');
const {
  updateDiceStatistic,
  updateWheelStatistic,
  getStatistic,
} = require('./statistic');

const response = (handler) => async (req, res) => {
  try {
    res.send(await handler(req.body));
  } catch (e) {
    res.status(400).send(e.message);
  }
};

async function start() {
  await knex.migrate.latest();

  redis.subscribe('dice', 'wheel');
  redis.on('message', async (channel, json) => {
    try {
      const data = JSON.parse(json);
      if (channel === 'dice') {
        await updateDiceStatistic(data);
      } else if (channel === 'wheel') {
        await updateWheelStatistic(data);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  });
  const app = express();

  app.use(bodyParser.json());

  app.post(
    '/get-statistic',
    response(async ({ user }) => getStatistic({ user }))
  );

  app.listen(80);
}

start();
