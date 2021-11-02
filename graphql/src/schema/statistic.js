const { GraphQLObjectType, GraphQLFloat, GraphQLString } = require('graphql');

const Summary = new GraphQLObjectType({
  name: 'Summary',
  fields: () => ({
    id: { type: GraphQLString },
    wagered: { type: GraphQLFloat },
    profit: { type: GraphQLFloat },
  }),
});

exports.Type = new GraphQLObjectType({
  name: 'Statistic',
  fields: () => ({
    diceStatistic: { type: Summary },
    wheelStatistic: { type: Summary },
  }),
});
