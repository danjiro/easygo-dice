# How to run
Same as the Get Started section below

## Fix the Dice tests:
`cd dice`
`npm run test`

or view commit `af9239c4498c24b439ae57753dc77f1d63a288ed`

## Add a New Game:

* Spin wheel
  ```
  mutation {
    spinWheel(amount: 2) {
      result
      payout
    }
  }
  ```
* Get active wheel seed
  ```
  {
    user {
      activeWheelSeed {
        secret
        hash
        nonce
      }
    }
  }
  ```
* Rotate wheel seed (note: rotate seed for dice game actually doesn't work but fixed for wheel game)
  ```
  mutation {
    rotateWheelSeed {
      secret
      hash
    }
  }
  ```
* Get list of wheel bets
  ```
  {
    user {
      name
      wheelBets {
        amount
        result
      }
    }
  }
  ```

## Add support for multiple games to the statistics service.

```
{
  user {
    name
    statistic {
      diceStatistic {
        wagered
        profit
      }
      wheelStatistic {
        wagered
        profit
      }
    }
  }
}
```

## Prevent multiple seed lookups
I believe for this the seed lookup CAN be different for each bet if the user rotates their seed? Either way you can use a join on the bets select to reduce number of calls...
```
{
  user {
    diceBets {
      result
      hash
    }
    wheelBets {
      result
      hash
    }
  }
}
```

# Casino Game Code Challenge
You have been provided with a simple dice game app exposed through a graphql api. 
The app uses cryptographic hashes to generate randomized outcomes to ensure the results are not rigged to favour the casino. 
This is very similar to what our clients websites stake.com and primedice.com use to gurantee provably fair results for the player. 

The backend is broken up into a top layer graphql API that talks to a dice and a statistic microservice. 
The statistic service is listening to bets created by the dice service to collect statistics for the user. 
Wagered is how much a user has bet overall, profit is how much money he/she won or lost.

To keep things simple we skipped most error handling, input validation and user register / login.

# Get Started
Run the `start.sh` script to get the backend running, the script will install top level / service level `node_modules` and start the App in docker-compose.
Navigate to `http://localhost/graphql` in your browser to open the graphQL schema.

You can place a bet using the following mutation:

```
mutation {
  rollDice(amount: 0.1, target: 60) {
    result
    payout
  }
}
```

To look at your previous bets and your statistics you can use the following query:
```
{
  user {
    name
    diceBets {
      amount
      target
      result
    }
    statistic {
      wagered
      profit
    }
  }
}
```

## Provably fair
Every user has a seed that determins the results for his bets. This seed is written to the database when the first bet is placed and gets used for all following bets.
```
{
  user {
    activeDiceSeed {
      secret
      hash
      nonce
    }
  }
}
```
The secret of an active seed is hidden, since it is used to determine the results of the bets.
If we would publish it the player could just calculate future results and therefore win every single game.
By publishing the hash of the secret we allow a user to verify that we did not change the secret in our favour after we created the seed.
The nonce gets incremented on every bet, so we get a unique set of inputs (secret + nonce) for every bet.

A player can request a new seed:
```
mutation {
  rotateDiceSeed {
    secret
    hash
  }
}
```
At that point we show the secret that we used to determine the bet results, so the player can verify that we did not choose results in our favour.

There are more detailed explanations on our clients websites if required, otherwise the code will explain a lot more :)

# The Challenge
## Fix the Dice tests:
The dice game uses an incrementing nonce to generate the result of each game. 
It is important that no nonces are duplicated or skipped, otherwise the casino could just skip a bet where the player wins.
One of the tests in the dice game is checking exactly that and is failing at the minute if the player managed to place bets really quickly one after another.
In the test this is just done with calling the `diceBet` function in a loop, but think of a player using hotkeys on a fast internet connection.
- Find a solid way to prevent skipped / duplicated nonces to make the test pass.

## Add a New Game:
We want to add a new game where the player spins a wheel divided into ten segments. Each segment has a number that the player's wager will be multiplied by. 
This game actually exists on stake.com, so lets use the same payouts :)
There is one field with a `1.50x` payout, seven fields with a `1.20x` payout and two fields with a `0.00x` payout.
- Add a wheel service to the codebase (it has to bbe provably fair)
- Add the wheel game to the graphql schema

## Add support for multiple games to the statistics service.
The statistic service is listening to a redis pub/sub to update the statistics for the user.
After you added the wheel game, the players want to know how much they wagered / profited per game, rather then just their overall statistics.
- Make the statistic service collect wagered / profit per game per user, rather then just per user
- Update the statistics in the graphql schema

## Prevent multiple seed lookups
When you look up the seed for a bet in the bet list of a user we currently do one request per bet to ask the dice service for the seed.
```
{
  user {
    diceBets {
      result
      seed {
        hash
        secret
      }
    }
  }
}
```
This is unneccessary since the seed lookup returns the exact same result each time and created load on the server.
- Find a way to reduce the seed lookups