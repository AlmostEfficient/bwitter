We will be creating a twitter app will have 5 features:

1. Create an account associated with your wallet
2. Make Tweets
3. Follow other wallets
4. Build a homepage
5. View other user's tweets

We will be using Anchor to create the SC and we'll be using Next.js (a react framework) to create our frontend.

New concepts that we will be learning will include:

1. Using Program Derived Address (PDA) in smart contracts
2. Solana-Lab Wallet Adapter Library
3. Next.js

# Smart Contract Explaination
## Learning about Program Derived Account (PDA)
In the Hello World program, we learn that we can store data on the Solana network by using the concept of Accounts. An account is represented by a public/private key pair that we own.

For the Twitter app, we don't want to create a new public/private key pair for every tweet. That would force the user to have to know which public key represents what and it'll be hard for other people to search for your tweet on the network.

To address these problems we're going to use Program Derived Accounts, which are accounts owned by the smart contract.

How PDA differ from normal Accounts is that they there are no private keys tied to the account. Without going to the details every existing hash of a public/private pair key exists on a curved line called ed2559 Elliptic Curve.

Anything that is outside of that line is a public key hash that belongs to a smart contract.

To create PDA's we need to learn the concept of 1) seeds and 2) bumps.

The hash for public key for our PDA is derived from our seed which is just a random assortment of variables that we use which use to generate a hash value.

The problem is that the hash value we generated might be on the ed2559 curve meaning that the hash incorrectly value represents a public/private key pair. To solve this we include the concept of a bump. Bumps is just a number that we apply to our hash value in the event that we on the curve. In most cases, we just leave it as the default which is we add 1 to our existing hash value.

# Writing our Smart Contract with PDA's
## Defining the data we're storing in our accounts

Looking at the Twitter Program we should first define the accounts to hold our data. They are:

**StateAccount**
```
// State Account Structure
#[account]
pub struct StateAccount {
    // Signer address
    pub authority: Pubkey,

    // Tweet count
    pub tweet_count: u64,

    // Follow count
    pub follow_count: u64,

    // User's username
    pub username: String,
}
```
This will be the structure of the Account we'll be using to store our User's State information.

1. Authority - who owns the PDA
2. Tweet Count - the # of tweets the user have made, this will become relevant later to find the user's tweets
3. Follow Count - the # of follows the user have made, this will become relevant later to find the user's followers
4. Username - the handle the chose to represent themselves

**Tweet Account**

```
// Tweet Account Structure
#[account]
pub struct TweetAccount {
    // Signer address
    pub authority: Pubkey,

    // Tweet text
    pub text: String,

    // Tweet timestamp 
    pub timestamp: i64,
}
```

This struct represent the tweet that the user has made

1. Authority - who made the tweet
2. Text - the tweet the user sent
3. Timestamp - a timestamp of when the user made the tweet

**Follow Account**

```
// Follow Account Structure
#[account]
pub struct FollowAccount {
    // Signer address
    pub authority: Pubkey,

    // Address that we are following
    pub follow: Pubkey,
}
```

Finally our Follow Account struct represents people who our user is following. 

1. Authority - who made the follow
2. Text - who the user is following

## Defining the Context we're sending to our Program
Now that we defined our PDA Account data, let's see how we would create them. To do this, we'll write the Context to create each of our account.

**CreateContext**
```
/// Contexts
/// CreateState context
#[derive(Accounts)]
pub struct CreateState<'info> {
    // State account PDA
    #[account(
        init,
        // State account seed uses the string "state" and the user's key
        seeds = [b"state".as_ref(), authority.key().as_ref()],
        bump,
        payer = authority,
        space = size_of::<StateAccount>() + USERNAME_LENGTH
    )]
    pub state: Account<'info, StateAccount>,

    // Authority (this is signer who paid transaction fee)
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```
The only thing we have never seen before is:
```
    #[account(
        init,
        // State account seed uses the string "state" and the user's key
        seeds = [b"state".as_ref(), authority.key().as_ref()],
        bump,
        payer = authority,
        space = size_of::<StateAccount>() + USERNAME_LENGTH
    )]
    pub state: Account<'info, StateAccount>,
```
We'll see later on, but the client side will be sending the state public key that we want to create and we'll be verifying that the account given to us matches the seed that we defined for our tweet.

```
seeds = [b"state".as_ref(), authority.key().as_ref()],
```
Under seed we can define an array of values that will be used to generate a hash value. In this case, we're combining the string state and the user's public key.

It's important to have a constant string to ensure that you don't accidentally reference another PDA in your Program and to include something you own (aka your personal public key) so that we can always reference the PDA.

In a way you can think of this as a hash map. We know the keys ("state" + public key) and so given these same inputs, we will always get the same account back.

Finally like mentioned before, we can just include a simple `bump` in the event that we generate a hash on the ed2559 curve.

The last interesting part is that we need to store all the variables that we defined on the network, but for variables like strings that can be an infinite size, we need to add additional values to limit the user. In the case of username, we did something like this:

```
space = size_of::<StateAccount>() + USERNAME_LENGTH
```

where `USERNAME_LENGTH` is the byte size of the length we want to allow our users to create .

Note: it's important to try and minimize space, because users will be paying for everything that will be stored on the blockchain.

**Create Tweet**
```
#[derive(Accounts)]
pub struct CreateTweet<'info> {
    // State account PDA
    // State account seed uses the string "state" and the user's key
    #[account(mut, seeds = [b"state".as_ref(), authority.key().as_ref()], bump)]
    pub state: Account<'info, StateAccount>,

    // Tweet Account PDA
    #[account(
        init,
        // Post account use string "post" and index of post as seeds
        seeds = [b"tweet".as_ref(), authority.key().as_ref(), state.tweet_count.to_be_bytes().as_ref()],
        bump,
        payer = authority,  
        // We get the size of the TweetAccount along with the maximum tweet size we allow to be stored
        space = size_of::<TweetAccount>() + TEXT_LENGTH
    )]
    pub tweet: Account<'info, TweetAccount>,

    // Authority (this is signer who paid transaction fee)
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    // Clock to save timestamp
    pub clock: Sysvar<'info, Clock>,
}
```

Just as before, this is similar to the creating a State, this is us creating the Tweet Account PDA.

Just like before looking at the seed:

```
seeds = [b"tweet".as_ref(), authority.key().as_ref(), state.tweet_count.to_be_bytes().as_ref()],
```

You can see that the hash values that we're using are:

1. the constant string `tweet`
2. the user's public key
3. the # of tweets the user has made

Note: we'll be incrementing the `tweet_count` every single time we make a tweet so the # will always be unique.

The reason why we have the counter is so that we have a mechanism in place that will always allow us to find all of the user's tweets (we'll see more on this later when we retrieve the account information in the web app)

Also note that we can also require other PDA's that we have created before.

```
#[account(mut, seeds = [b"state".as_ref(), authority.key().as_ref()], bump)]
pub state: Account<'info, StateAccount>,
```

The key difference here is that we don't have the `init` keyword for our user state.

Finally the last thing new is that we also pass in a clock which we will use to set the timestamp for when our tweet was published

```
// Clock to save timestamp
pub clock: Sysvar<'info, Clock>,
```

**Create Follow**
```
#[derive(Accounts)]
pub struct CreateFollow<'info> {
    // State account PDA
    // State account seed uses the string "state" and the user's key
    #[account(mut, seeds = [b"state".as_ref(), authority.key().as_ref()], bump)]
    pub state: Account<'info, StateAccount>,

    // Follow Account PDA
    #[account(
        init,
        // Follow account seed uses string "follow", the user's key, and their current follow count to derive a PDA seed
        seeds = [b"follow".as_ref(), authority.key().as_ref(), state.follow_count.to_be_bytes().as_ref()],
        bump,
        payer = authority,  
        // TODO: do we really need to get the size of the pubkey?
        space = size_of::<FollowAccount>()
    )]
    pub follow: Account<'info, FollowAccount>,

    // Authority (this is signer who paid transaction fee)
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Account that we want to follow
    pub follow_key: UncheckedAccount<'info>,
}
```
There's nothing much to say about Follow that Tweet hasn't already covered.

## Creating the instructions for each context

```
#[program]
pub mod twitter {
    use super::*;

    pub fn create_state(
        ctx: Context<CreateState>,
        username: String,
    ) -> Result<()> {
        // Get state Account
        let state = &mut ctx.accounts.state;
        // Set authority
        state.authority = ctx.accounts.authority.key();
        // Initialize state account
        state.tweet_count = 0;
        state.follow_count = 0;
        state.username = username;
        Ok(())
    }
    
    pub fn create_tweet(
        ctx: Context<CreateTweet>,
        text: String,
    ) -> Result<()>  {
        // Get State Account
        let state = &mut ctx.accounts.state;

        // Get Tweet Account
        let tweet = &mut ctx.accounts.tweet;
        // Set authority
        tweet.authority = ctx.accounts.authority.key();
        // Set text
        tweet.text = text;
        // set timestamp
        tweet.timestamp = ctx.accounts.clock.unix_timestamp;

        // Increase state's tweet count by 1
        state.tweet_count += 1;
        Ok(())
    }

    pub fn create_follow(
        ctx: Context<CreateFollow>
    ) -> Result<()>  {
        // Get State Account
        let state = &mut ctx.accounts.state;

        // get the Follow Account
        let follow_account = &mut ctx.accounts.follow;
        // Set authority
        follow_account.authority = ctx.accounts.authority.key();
        // Set follow key
        follow_account.follow = ctx.accounts.follow_key.key();

        // Increase state's tweet count by 1
        state.follow_count += 1;
        Ok(())
    }
}
```

Using the data is straightforward so I'll let the code speak for itself here.

## Deploying the Program
The deployment process is the same as previous project. In this project we are deploying to localhost.

`solana test validator` - to start the server

`anchor deploy` - builds and deploys our program onto our network

Reminder: don't forget to grab the newly generated program address and replace our existing one with it.

# Setting up the Next.js Web App
## Learning about the Wallet Adapter library
The solana team has created a helper library called [wallet adapter](https://github.com/solana-labs/wallet-adapter) that provides UI components and react hooks to listen for connection/disconnection of many Solana wallets including the one we'll be using: Phantom Wallet.

They even have react starter projects that we can use that has setup the React providers to listen for react hooks that the library implements. In this project, I chose to use the [next.js starter template](https://github.com/solana-labs/wallet-adapter/tree/master/packages/starter/nextjs-starterhttps://github.com/solana-labs/wallet-adapter/tree/master/packages/starter/nextjs-starter)

## Learning about Next.js
Next.js is an open source react framework that is used to help create React web applications having many modern-day techniques built into the framework such as supporting server side rendering and supporting generating static webpages. 

We'll be using Next.js to generate 2 static pages for our twitter app

1. The home feed to show all of the tweets from the people we are following
2. A user's page for us to follow them and see their tweets

## Next.js File structure
```
project
|
└───components
│   │   Feed.tsx
│   │   Main.tsx
|   |   ...
|
└───pages
|   │   _app.tsx
|   │   [user].tsx
|   |   index.tsx
|    
└───public
    │   idl.json
    │   ...
|    
└───styles
    │   Feed.module.css
    │   ...
```
A quick look at the file structure.

* pages - these are the static webpages for our web app. The name of the component represents the url path.
* components - these are the UI components created for the app
* public - these are for public assets, the most important thing here is that we're placing our idl.json which is generated by anchor when we build our program to help the client side communicate with it
* styles - these are the styles used for the UI component

## A quick look at _app.tsx
Before you try to read the code, this is just the default setup work needed to setup React providers to use the Wallet Adapter.
```
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
	GlowWalletAdapter,
	PhantomWalletAdapter,
	SlopeWalletAdapter,
	SolflareWalletAdapter,
	TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { AppProps } from 'next/app';
import { FC, useMemo } from 'react';

// Use require instead of import since order matters
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');
require('../styles/Home.module.css')
// require('./Main.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
	// Can be set to 'devnet', 'testnet', or 'mainnet-beta'
	// const network = WalletAdapterNetwork.Devnet;
	const network = "http://127.0.0.1:8899";

	// You can also provide a custom RPC endpoint
	const endpoint = useMemo(() => network, [network]);

	// @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
	// Only the wallets you configure here will be compiled into your application, and only the dependencies
	// of wallets that your users connect to will be loaded
	const wallets = useMemo(
		() => [
			new PhantomWalletAdapter(),
		],
		[]
	);

	return (
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider wallets={wallets} autoConnect>
				<WalletModalProvider>
					<Component {...pageProps} />
				</WalletModalProvider>
			</WalletProvider>
		</ConnectionProvider>
	);
};

export default App;
```

The name `_app.tsx` is special, it represents a global component that all other components are a child of. As a result all the React Provider we set up here is applied for all the other pages that we created.

## Creating the home page
### index.ts
```
import type { NextPage } from 'next'
import Main from '../components/Main'

const HomePage: NextPage = () => {
  return (
    <Main />
  )
}

export default HomePage
```
Nothing too special, we just render the Main component

One thing to note that index.ts corresponds to the url root directory `/`

### Main.ts

```
import {useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React, { FC, useState, useEffect } from 'react';

import styles from '../styles/Home.module.css';
import SignUp from './SignUp';
import Feed from './Feed';
import { getProgram, getStateAccount } from './util';

const Main: FC = () => {
	const anchorWallet = useAnchorWallet();
	const [hasAccount, setHasAccount] = useState(false);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
        if (anchorWallet) {
            showLoginPage()
            setConnected(true);
        } else {
            setConnected(false);
        }
    }, [anchorWallet]);
	
	async function showLoginPage() {
		if (!anchorWallet) {
            throw("Something went wrong, wallet is null");
        }
		const program = getProgram(anchorWallet);
		try {
			await getStateAccount(anchorWallet.publicKey, program);
			// since we didn't throw an error, we must have an account
			setHasAccount(true);
			return;
		} catch (err) {
			console.log(err);
		}
		// since we errored out, we don't have an account
		setHasAccount(false);
	}

	async function submitSuccessful() {
		setHasAccount(true);
	}

 	return (
		<div className={styles.twitterContainer}> 
			<h1>Latest Tweets</h1>
			<WalletMultiButton />
			<div>
				{connected ?
				 	hasAccount ? <Feed /> : <SignUp onSubmit={submitSuccessful}/> 
					: "please connect your wallet"}
			</div>
		</div>
  	)
}

export default Main
```

There's a lot going on here, but the goal of the main component is to detect if the user is connected to their wallet and if they have an account.

* If a user isn't connected to their wallet, we display a message asking them to connect
* If a user is connected, but doesn't have an account, we ask them to sign up (send a transaction to create their state)
* If a user is connected and has an account, we render their feed of all the tweets they and their followers have made

Now to understand how the wallet adapter works, if you look at the react component we're rendering:

```
 	return (
		<div className={styles.twitterContainer}> 
			<h1>Latest Tweets</h1>
			<WalletMultiButton />
			<div>
				{connected ?
				 	hasAccount ? <Feed /> : <SignUp onSubmit={submitSuccessful}/> 
					: "please connect your wallet"}
			</div>
		</div>
  	)
```
We're using a `WalletMultiButton` ui component. This button was provided by the `wallet adapter` library and it helps connect the user's Solana wallet and access their public key.

Now that we know how we get the user's wallet information we can begin understanding the logic of this code.

It's most helpful to look at the states that we're working with:

```
const anchorWallet = useAnchorWallet();
const [hasAccount, setHasAccount] = useState(false);
const [connected, setConnected] = useState(false);
```

`useAnchorWallet()` is a react hook provided to use from `wallet adapter` to help us access the user's public key to their wallet.

`connected` is a state to represent if a user is connected to their wallet

`hasAccount` is a state to represent if a user has an account associated with their wallet.

We initially set this information by calling `useEffect`

```
useEffect(() => {
    if (anchorWallet) {
        showLoginPage()
        setConnected(true);
    } else {
        setConnected(false);
    }
}, [anchorWallet]);
```

The code is self explainatory, the only thing to note is that we are listening for changes to `anchorWallet`, specifically if it ever changes, that means either the user has connected or disconnected their wallet. And when that happens we need to trigger a re-render.

Looking into `showLoginPage()` we can begin to look at how we can interact with our PDA

```
async function showLoginPage() {
    if (!anchorWallet) {
        throw("Something went wrong, wallet is null");
    }
    const program = getProgram(anchorWallet);
    try {
        await getStateAccount(anchorWallet.publicKey, program);
        // since we didn't throw an error, we must have an account
        setHasAccount(true);
        return;
    } catch (err) {
        console.log(err);
    }
    // since we errored out, we don't have an account
    setHasAccount(false);
}
```

From the previous project, we know how to access the program that we deployed on the solana network using anchor and how to send instructions, but what we don't know is how to get PDA information.

I've moved many shared code to a helper file called `util.ts`, but this code gets our program we deployed, checks to see if a user has an account, and then we set our `hasAccount` state based off of our result.

## Looking into util.ts

There's a lot of helper function here, most of them involves getting PDA information. Here's the one we're currently interested in:

```
export function getProgram(anchorWallet: AnchorWallet) {
  const network = "http://127.0.0.1:8899";
  const connection = new Connection(network, "processed");
  const provider = new AnchorProvider(
    connection, anchorWallet, {"preflightCommitment": "processed"},
  );
  return new Program(idl, idl.metadata.address, provider);
}

export async function getHasAccount(anchorWallet: AnchorWallet) {
  const program = getProgram(anchorWallet)
  try {
    await getStateAccount(anchorWallet.publicKey, program);
    // since we didn't throw an error, we must have an account
    return true;
  } catch (err) {
    console.log(err);
  }
  // since we errored out, we don't have an account
  return false;
}

export async function getStatePDA(publicKey: PublicKey, program: Program) {
  let [statePDA] = await web3.PublicKey.findProgramAddress(
    [utf8.encode('state'), publicKey.toBuffer()],
    program.programId,
  )
  return statePDA;
}

export async function getStateAccount(publicKey: PublicKey, program: Program) {
    const statePDA = await getStatePDA(publicKey, program);
    const stateAccount = await program.account.stateAccount.fetch(statePDA);
    return stateAccount;
}
```

`getProgram` - helper function to get the program we deployed via anchor. Standard code to talk to a locally deployed Program

`getHasAccount` - helper function we call to see if the user has created an account

`getStatePDA` - helper function to get the public key of our State PDA based off of the seed information we provide

`getStateAccount` - helper function to get the State Account based off of the address of the PDA we provide

A common pattern to get our PDA is to:

1) Look up the PDA address associated with our program based off of our seed

```
let [statePDA] = await web3.PublicKey.findProgramAddress(
    [utf8.encode('state'), publicKey.toBuffer()],
    program.programId,
)
```
Note that we pass in an array of seed values that we defined in our program for state.
`[utf8.encode('state'), publicKey.toBuffer()]`

2) Then with the address `statePDA` we fetch the Account information stored on the address by using our anchor library:

```
const stateAccount = await program.account.stateAccount.fetch(statePDA);
```


3. Once we have the account information, we have access to the user's account information.

Note 1: it's very important to always use await, because we are making network calls.

Note 2: the network fetch requests can fail either because the account doesn't exist or because of network issues. This will throw an exception that we have to catch otherwise our app will just crash.

Now that we understand how we can access our PDA we can go back to `Main.tsx`

## Back in Main.tsx

Now that we know how to check if a user has a State PDA created for them or not, we can continue with the rest of our logic.

If the user is connected to their wallet but doesn't have an account, we will render `Signup.tsx`

```
{connected ?
    hasAccount ? <Feed /> : <SignUp onSubmit={submitSuccessful}/> 
    : "please connect your wallet"}
```

Note: if the signup is succsesful, we passed in a callback function `submitSuccessful` that wil just cause us to change our hasAccount state and show the user's feed.

## Looking at Signup.tsx

```
import {useAnchorWallet } from '@solana/wallet-adapter-react';
import {web3
} from '@project-serum/anchor';
import React, { FC, useState } from 'react';
import {getProgram, getStatePDA} from './util';

interface SignUpProps {
	onSubmit: () => void;
}

const SignUp: FC<SignUpProps> = (props) => {
	const anchorWallet = useAnchorWallet();
	const [username, setUsername] = useState("");

	async function initializeInstruction() {
		if (!anchorWallet) {
			throw("Something went wrong, wallet is null");
		}
		const program = getProgram(anchorWallet);
		try {
			/* interact with the program via rpc */
			const statePDA = await getStatePDA(anchorWallet.publicKey, program);

			await program.methods.createState(username).accounts({
				state: statePDA,
				authority: anchorWallet.publicKey,
				systemProgram: web3.SystemProgram.programId,
			}).rpc();
			props.onSubmit();
		} catch (err) {
		  console.log("Transaction error: ", err);
		}
	}

 	return (
		<div> 
			<h1>Create Your Account</h1>
			Username: <input placeholder='Username' onChange={e => setUsername(e.target.value)}/>
			<button onClick={initializeInstruction}>sign up</button>
		</div>
  	)
}

export default SignUp
```

This code just renders a very crude sign-up form. The only interesting part is when the user submits their username and triggers the initializeInstruction callback

```
async function initializeInstruction() {
    if (!anchorWallet) {
        throw("Something went wrong, wallet is null");
    }
    const program = getProgram(anchorWallet);
    try {
        /* interact with the program via rpc */
        const statePDA = await getStatePDA(anchorWallet.publicKey, program);

        await program.methods.createState(username).accounts({
            state: statePDA,
            authority: anchorWallet.publicKey,
            systemProgram: web3.SystemProgram.programId,
        }).rpc();
        props.onSubmit();
    } catch (err) {
        console.log("Transaction error: ", err);
    }
}
```

Nothing here is too new from what we've seen before. The only thing to note is how we pass in the PDA that we want to init when we send the transaction to our Program.

```
await program.methods.createState(username).accounts({
    state: statePDA,
    authority: anchorWallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
}).rpc();
```

to initialize our State PDA we just pass in the public key of the State that we would get by using our seeds: "state" + the user's connected public key. Then we create and submit our transaction via anchor.

Now we know how to create an account, we actually now know all the concepts needed to understand the rest of the code so I'll only touch on some brief points in the remaining components.

## Looking at Feed.tsx
Now that the user is signed in, we'll show `Feed.tsx` to the user. There's a lot here, so let's just focus on creating tweets before looking at creating a feed.

```
const tweetElements = tweetList.map(tweet => 
    <Tweet key={tweet.tweet} {...tweet} />
);

return (
    <div> 
        <input className={styles.input} placeholder='Tweet' value={input} onChange={e => setInput(e.target.value)}/>
        <button onClick={addTweet}>Tweet</button>
        <div>
            {tweetList.length === 0 ? "No tweets" : tweetElements}
        </div>
    </div>
)
```

`addTweet`:
```
async function addTweet() {
    if (!anchorWallet) {
        throw("something went wrong wallet isn't connected");
    }
    const program = getProgram(anchorWallet)
    try {
        const statePDA = await getStatePDA(anchorWallet.publicKey, program);
        const stateAccount = await getStateAccount(anchorWallet.publicKey, program);
        const tweetPDA = await getTweetPDA(anchorWallet.publicKey, program, stateAccount.tweetCount);
        let text = input;

        await program.methods.createTweet(text).accounts({
            state: statePDA,
            tweet: tweetPDA,
            authority: anchorWallet.publicKey,
            systemProgram: web3.SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        }).rpc();
        const tweetAccount = await program.account.tweetAccount.fetch(tweetPDA);
        setInput("");
        tweetList.unshift({
            tweet: tweetAccount.text, 
            authorName: stateAccount.username, 
            authorKey: anchorWallet.publicKey.toBase58(), 
            timestamp: tweetAccount.timestamp
        });
        setTweetList(tweetList);
    } catch (err) {
        console.log("Transaction error: ", err);
    }
}
```

Inside our onClick event listener, we do exactly the same thing we did with State, except this time we're using anchor to call our `CreateTweet` instruction.

The only thing new is that we're providing the public key to a clock to rely on to create a timestamp for our tweet, but that's a hard coded value anchor provides us.

```
await program.methods.createTweet(text).accounts({
    state: statePDA,
    tweet: tweetPDA,
    authority: anchorWallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
    clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
}).rpc();
```

Getting ahead of ourselves a bit, just like Twitter, when the user makes a new tweet, it is added to their feed. We define a State in `Feed` called `tweetList` that represents all of the tweets in the user's feed. We just add their latest tweet in the list:

```
tweetList.unshift({
    tweet: tweetAccount.text, 
    authorName: stateAccount.username, 
    authorKey: anchorWallet.publicKey.toBase58(), 
    timestamp: tweetAccount.timestamp
});
setTweetList(tweetList);
```

Note: `unshift`, because we want newest tweets to be on top.

Before we see how we populate our Feed for everyone that they're following, let's see how we can follow a user first and see all the tweets that they have ever made.

## Looking into the [user].tsx page
The filename is interesting. It's intended this way because this allows us to generate pages based off of the url param.

Specifically this page will be rendered for urls like: /123, /abc, etc

This is important because user here will be the public key of the user who tweets we want to read.
```
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import User from '../components/User'

const UserPage: NextPage = () => {
	const router = useRouter()
	const { user } = router.query;
  if (typeof user !== 'string') {
    return (<></>)
  }
  return (
    <User id={user} />
  )
}

export default UserPage;
```
As we can see we get the url value by using the router hook provided by Next.js:

```
const router = useRouter()
const { user } = router.query;
```

We pass in the public key of the user we're interested in reading from to `User`

## Looking into User.tsx

```
/* eslint-disable react-hooks/rules-of-hooks */
import {useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { web3} from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import React, { FC, useState, useEffect } from 'react';

import styles from '../styles/User.module.css';
import { getFollowAccount, getFollowPDA, getHasAccount, getProgram, getStateAccount, getStatePDA, getTweetAccount } from './util';
import Tweet, { TweetProps } from './Tweet';

const anchor = require('@project-serum/anchor');

interface UserProps {
  id: string;
}

const User: FC<UserProps> = (props) => {
  const anchorWallet = useAnchorWallet();
  const [tweetList, setTweetList] = useState<TweetProps[]>([]);
  const [isFollow, setIsFollow] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (anchorWallet) {
      console.log("connected to wallet");
      initialSetup();
    } else {
      console.log("disconnect from wallet");
    }
  }, [anchorWallet]);

  async function initialSetup() {
    if (!anchorWallet) {
      throw("Expected wallet to not be null");
    }
    console.log("calling the initial use effect");
    setIsFollow(await isFollowing());
    setHasAccount(await getHasAccount(anchorWallet));
    setTweetList(await getAllPost());
    setUsername(await getUsername());
  }
  
  async function getAllPost() {
    if (!anchorWallet) {
        throw("something went wrong wallet isn't connected");
    }
        
    const program = getProgram(anchorWallet)
    const userKey = new PublicKey(props.id);
    const arr: TweetProps[] = [];
    try {
      const stateAccount = await getStateAccount(new PublicKey(props.id), program);
      // We iterate backwards, because the newest tweets are on the top
      for (let i = stateAccount.tweetCount.toNumber() - 1; i >= 0 ; i--) {
        const tweetAccount = await getTweetAccount(userKey, program, i);
        arr.push({
          tweet: tweetAccount.text, 
          authorName: stateAccount.username, 
          authorKey: props.id, 
          timestamp: tweetAccount.timestamp
        });
      }
    } catch (err) {
      console.log("Transaction error: ", err);
    }
    return arr;
  }
  
  async function getUsername() {
    if (!anchorWallet) {
      throw("something went wrong wallet isn't connected");
    }
        
    const program = getProgram(anchorWallet)
    const userKey = new PublicKey(props.id);
    try {
      const stateAccount = await getStateAccount(userKey, program);
      return stateAccount.username;
    } catch (err) {
      console.log("Transaction error: ", err);
    }
    return "";
  }

  // We don't have a way to quickly check if we're following the user.
  // Instead we will scan through all of our followers to see if we have a match
  async function isFollowing() {
    if (!anchorWallet) {
        throw("something went wrong wallet isn't connected");
    }
        
    const program = getProgram(anchorWallet)
    try {
      const stateAccount = await getStateAccount(anchorWallet.publicKey, program);
      for (let i = 0; i < stateAccount.tweetCount.toNumber(); i++) {
          const followAccount = await getFollowAccount(anchorWallet.publicKey, program, i);
          if (followAccount.follow.toBase58() === props.id) {
              return true;
          }
      }
    } catch (err) {
      console.log("Transaction error: ", err);
    }
      return false;
    }

  async function createFollow() {
    if (!anchorWallet) {
    throw("something went wrong wallet isn't connected");
    }
        
    const program = getProgram(anchorWallet)
    try {
      const statePDA = await getStatePDA(anchorWallet.publicKey, program);//program.account.stateAccount.fetch(stateSigner);
      const stateAccount = await getStateAccount(anchorWallet.publicKey, program);
      const followPDA = await getFollowPDA(anchorWallet.publicKey, program, stateAccount.followCount);

      let followKey = new PublicKey(props.id);
      await program.methods.createFollow().accounts({
        state: statePDA,
        follow: followPDA,
        authority: anchorWallet?.publicKey,
        followKey: followKey,
        systemProgram: web3.SystemProgram.programId,
      }).rpc();
      setIsFollow(true);
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  const tweetElements = tweetList.map(tweet => 
    <Tweet key={tweet.tweet} {...tweet} />
  );
    // Only show the follow button if we have an account and we're not viewing our own account
    const showFollowButton = props.id !== anchorWallet?.publicKey.toBase58() || !hasAccount;

   return (
    <div className={styles.twitterContainer}>
      <div className={styles.userContainer}>
        <div className={styles.username}>{username}</div>
        <div className={styles.userkey}>@{props.id}</div>
        
        {showFollowButton &&
          <button onClick={createFollow} disabled={isFollow}>{isFollow ? "Following" : "Follow"}</button>}
      </div>
        <WalletMultiButton />
      <div className={styles.tweetContainer}>{tweetElements}</div>
    </div>
  )
}

export default User
```

This is one of the bigger files, but at this point, nothing in the code should be new.

Looking at the states we use:

```
const anchorWallet = useAnchorWallet();
const [tweetList, setTweetList] = useState<TweetProps[]>([]);
const [isFollow, setIsFollow] = useState(false);
const [hasAccount, setHasAccount] = useState(false);
const [username, setUsername] = useState("");
```

`anchorWallet` - the user's wallet
`tweetList` - the list of tweets that this user has made. This is of type TweetProps, which is the props defined to represent our Tweet UI.
`isFollow` - are we following this user
`hasAccount` - are we logged into our account
`username` - what is the username of this user

Just like in Main, we call `useEffect` to setup our initial state:

```
  useEffect(() => {
    if (anchorWallet) {
      console.log("connected to wallet");
      initialSetup();
    } else {
      console.log("disconnect from wallet");
    }
  }, [anchorWallet]);

  async function initialSetup() {
    if (!anchorWallet) {
      throw("Expected wallet to not be null");
    }
    console.log("calling the initial use effect");
    setIsFollow(await isFollowing());
    setHasAccount(await getHasAccount(anchorWallet));
    setTweetList(await getAllPost());
    setUsername(await getUsername());
  }
```

I won't go into the detail of each of the functions, we call in `initialSetup` they're all very similar in the way we retrieve the PDA Account from previous examples.

The only interesting thing to show is to see how we generate all of the user's tweets in `getAllPost`. In our current state, we actually don't have a way to get the user's tweets. See how we solve this problem here with `tweetCount`.

```
async function getAllPost() {
    if (!anchorWallet) {
        throw("something went wrong wallet isn't connected");
    }
        
    const program = getProgram(anchorWallet)
    const userKey = new PublicKey(props.id);
    const arr: TweetProps[] = [];
    try {
      const stateAccount = await getStateAccount(new PublicKey(props.id), program);
      // We iterate backwards, because the newest tweets are on the top
      for (let i = stateAccount.tweetCount.toNumber() - 1; i >= 0 ; i--) {
        const tweetAccount = await getTweetAccount(userKey, program, i);
        arr.push({
          tweet: tweetAccount.text, 
          authorName: stateAccount.username, 
          authorKey: props.id, 
          timestamp: tweetAccount.timestamp
        });
      }
    } catch (err) {
      console.log("Transaction error: ", err);
    }
    return arr;
  }
```
We get the StateAccount PDA of the user who's public key we're on (this is passed in from the URL we are currently on). ie. if my public key is 123456, /123456 will be the page that will show my public profile.

**IMPORTANT** With the State PDA we can now access all the tweets the user has ever made from looking at `tweetCount`.

Remember, the seed for our Tweet Account is `["tweet", user's public key, tweet #]`. We have the user's public key and now we know the #'s of tweets they have made so now we can get the public key of all the tweets they've made and then fetch the PDA associated with it.

With the tweet, we can then finally add it to our list of tweets for the user who's page we are on:

```
arr.push({
    tweet: tweetAccount.text, 
    authorName: stateAccount.username, 
    authorKey: props.id, 
    timestamp: tweetAccount.timestamp
});
```
Note that for the tweet object I'm combining information from multiple sources.

Now that we have the list, we set our state with it and we can then render the list:

Looking at our HTML:
```
  const tweetElements = tweetList.map(tweet => 
    <Tweet key={tweet.tweet} {...tweet} />
  );
    // Only show the follow button if we have an account and we're not viewing our own account
    const showFollowButton = props.id !== anchorWallet?.publicKey.toBase58() || !hasAccount;

   return (
    <div className={styles.twitterContainer}>
      <div className={styles.userContainer}>
        <div className={styles.username}>{username}</div>
        <div className={styles.userkey}>@{props.id}</div>
        
        {showFollowButton &&
          <button onClick={createFollow} disabled={isFollow}>{isFollow ? "Following" : "Follow"}</button>}
      </div>
        <WalletMultiButton />
      <div className={styles.tweetContainer}>{tweetElements}</div>
    </div>
  )
```
Now that we have the list, the only last thing to do is to allow our user to follow user on the page we're on.

We can accomplish this by clicking on the follow button which will trigger the `createFollow` callback.

I won't go into the code, because it's very similar to createTweet.

Now that we understand all of this, let's go back to `Feed.tsx` to see how we generate the user's feed.

## Generating the user's feed in Feed.tsx

The user's feed is generated by calling these 2 functions:

```
	async function createHomepage() {
		if (!anchorWallet) {
			throw("something went wrong wallet isn't connected");
		}
		const program = getProgram(anchorWallet)
		try {
			// Get list of all people we are following
			const stateAccount = await getStateAccount(anchorWallet.publicKey, program);
			const followAccounts = [];
			for (let i = 0; i < stateAccount.followCount.toNumber(); i++) {
				const followPDA = await getFollowPDA(anchorWallet.publicKey, program, i);
				followAccounts.push(followPDA); 
			}
			const followInfos = await program.account.followAccount.fetchMultiple(followAccounts);

			// Create list of all tweets
			let tweetAccounts: TweetProps[] = [];

			// Get tweets from ourselves
			await buildTweetList(program, anchorWallet.publicKey, tweetAccounts);

			// get tweets from people we are following
			for (let followInfo of followInfos) {
				if (!followInfo) continue;
				await buildTweetList(program, followInfo.follow, tweetAccounts);
			}
			tweetAccounts = tweetAccounts.sort((a,b) => b.timestamp - a.timestamp);
			setTweetList(tweetAccounts);
			console.log("Home page Tweets", tweetAccounts);
		} catch (err) {
		  console.log("Transaction error: ", err);
		}
	}

	async function buildTweetList(program: Program, publicKey: PublicKey, tweetAccounts: TweetProps[]) {
		try {
			const stateAccount = await getStateAccount(publicKey, program);
			// TODO change to tweetCount
			for (let i = 0; i < stateAccount.tweetCount.toNumber(); i++) {
				try {
					const tweetAccount = await getTweetAccount(publicKey, program, i);

					tweetAccounts.push({
						tweet: tweetAccount.text, 
						authorName: stateAccount.username, 
						authorKey: publicKey.toBase58(), 
						timestamp: tweetAccount.timestamp
					});
				} catch (err) {
					// we have an internal try catch, because we want to resume collecting other tweets
					console.log("error getting tweet", err);
				}
			}
		} catch(err) {
			console.log("error getting the user state info", err);
		}
	}
```

The code isn't be too differnet from what we did in `User.tsx`, except instead of getting the tweets of the user who's page we're on, we are using all the different Account PDA that we've defined to generate the home page.

Here's what we do on the high level:

1. We get the user's State information
2. With the state information we get all of the user's Tweet PDA and add it to our home page list
3. Then with the user's state information, we get the Follow PDA of each user they are following
4. For each of the Follow PDA, we can look up the State PDA of that user
5. with that user's State PDA, we can now get all the Tweet PDA that they have made and add it to our list
6. Finally after we're done going through all of the people the user is following, we just need to sort our home page by the timestamp of the tweet to show the newest ones on top.