exports.up = async (knex) => {
  await knex.schema.createTable('wheel_seed', (table) => {
    table.uuid('id').primary();

    table.string('user').notNull();

    table.boolean('active').notNull();

    table.string('secret').notNull();
    table.string('hash').notNull();

    table.integer('nonce').notNull();
  });

  await knex.raw(
    'create unique index seed_user_actice_unique_index on wheel_seed ("user") where active = true'
  );

  await knex.schema.createTable('wheel_bet', (table) => {
    table.uuid('id').primary();

    table.string('user').notNull();

    table.uuid('seed_id').references('wheel_seed.id').notNull();

    table.integer('nonce').notNull();

    table.float('result').notNull();

    table.float('amount').notNull();

    table.float('payout').notNull();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull().index();
  });
};

exports.down = async () => {};
