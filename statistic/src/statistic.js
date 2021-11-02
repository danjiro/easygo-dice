const { v4: uuid } = require('uuid');
const { knex } = require('./knex');

exports.updateDiceStatistic = async ({ user, amount, payout }) => {
  await knex.raw(
    `
      insert into dice_statistic (
        "id", "user", "wagered", "profit"
      ) values (
        :id, :user, :wagered, :profit
      )
      on conflict ("user") do  update
      set 
      wagered = dice_statistic.wagered + :wagered,
      profit = dice_statistic.profit + :profit
    `,
    {
      id: uuid(),
      user,
      wagered: amount,
      profit: payout - amount,
    }
  );
};

exports.updateWheelStatistic = async ({ user, amount, payout }) => {
  await knex.raw(
    `
      insert into wheel_statistic (
        "id", "user", "wagered", "profit"
      ) values (
        :id, :user, :wagered, :profit
      )
      on conflict ("user") do  update
      set
      wagered = wheel_statistic.wagered + :wagered,
      profit = wheel_statistic.profit + :profit
    `,
    {
      id: uuid(),
      user,
      wagered: amount,
      profit: payout - amount,
    }
  );
};

exports.getStatistic = async ({ user }) => {
  const [diceStatistic] = await knex('dice_statistic').where('user', user);
  const [wheelStatistic] = await knex('wheel_statistic').where('user', user);

  return { diceStatistic, wheelStatistic };
};
