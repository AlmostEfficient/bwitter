import {useAnchorWallet } from '@solana/wallet-adapter-react';
import {web3, Program} from '@project-serum/anchor';
import React, { FC, useEffect, useState } from 'react';
import {getFollowPDA, getProgram, getStateAccount, getStatePDA, getTweetAccount, getTweetPDA} from './util';

import styles from '../styles/Feed.module.css';
import { PublicKey } from '@solana/web3.js';
import Tweet, { TweetProps } from './Tweet';

const anchor = require('@project-serum/anchor')

interface FeedProps {
}

const Feed: FC<FeedProps> = (props) => {
	const anchorWallet = useAnchorWallet();
	const [input, setInput] = useState(''); // '' is the initial state value
	const [tweetList, setTweetList] = useState<TweetProps[]>([]); // TODO: how do we call initial construction data or we wait?

	useEffect(() => {
		if (anchorWallet) {
			initialSetup();
		}
	}, [anchorWallet]);

	async function initialSetup() {
		createHomepage();
	}

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
}

export default Feed
