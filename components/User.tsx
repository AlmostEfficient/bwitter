/* eslint-disable react-hooks/rules-of-hooks */
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { web3 } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import React, { FC, useState, useEffect, SetStateAction } from "react";

import styles from "../styles/User.module.css";
import { getFollowAccount, getFollowPDA, getHasAccount, getProgram, getStateAccount, getStatePDA, getTweetAccount } from "./util";
import Tweet, { TweetProps } from "./Tweet";

const anchor = require("@project-serum/anchor");

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
            throw "Expected wallet to not be null";
        }
        console.log("calling the initial use effect");
        setIsFollow(await isFollowing());
        setHasAccount(await getHasAccount(anchorWallet));
        setTweetList(await getAllPost());
        setUsername((await getUsername()) as SetStateAction<string>);
    }

    async function getAllPost() {
        if (!anchorWallet) {
            throw "something went wrong wallet isn't connected";
        }

        const program = getProgram(anchorWallet);
        console.log(props.id);
        const userKey = new PublicKey(props.id);
        const arr: TweetProps[] = [];
        try {
            const stateAccount = await getStateAccount(new PublicKey(props.id), program);
            // We iterate backwards, because the newest tweets are on the top
            for (let i = (stateAccount.tweetCount as any).toNumber() - 1; i >= 0; i--) {
                const tweetAccount = await getTweetAccount(userKey, program, i);

                arr.push({
                    tweet: tweetAccount.text as string,
                    authorName: stateAccount.username as string,
                    authorKey: props.id,
                    timestamp: tweetAccount.timestamp as number,
                });
            }
        } catch (err) {
            console.log("Transaction error: ", err);
        }
        return arr;
    }

    async function getUsername() {
        if (!anchorWallet) {
            throw "something went wrong wallet isn't connected";
        }

        const program = getProgram(anchorWallet);
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
            throw "something went wrong wallet isn't connected";
        }

        const program = getProgram(anchorWallet);
        try {
            const stateAccount = await getStateAccount(anchorWallet.publicKey, program);
            if (stateAccount.followAccount) {
                for (let i = 0; i < (stateAccount.followAccount as any).toNumber(); i++) {
                    const followAccount = await getFollowAccount(anchorWallet.publicKey, program, i);
                    if ((followAccount.follow as any).toBase58() === props.id) {
                        return true;
                    }
                }
            }
        } catch (err) {
            console.log("Transaction error: ", err);
        }

        return false;
    }

    async function createFollow() {
        if (!anchorWallet) {
            throw "something went wrong wallet isn't connected";
        }

        const program = getProgram(anchorWallet);
        try {
            const statePDA = await getStatePDA(anchorWallet.publicKey, program); //program.account.stateAccount.fetch(stateSigner);
            const stateAccount = await getStateAccount(anchorWallet.publicKey, program);
            const followPDA = await getFollowPDA(anchorWallet.publicKey, program, stateAccount.followCount as number);

            let followKey = new PublicKey(props.id);
            await program.methods
                .createFollow()
                .accounts({
                    state: statePDA,
                    follow: followPDA,
                    authority: anchorWallet?.publicKey,
                    followKey: followKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
            setIsFollow(true);
        } catch (err) {
            console.log("Transaction error: ", err);
        }
    }

    const tweetElements =
        tweetList.length > 0 ? (
            tweetList.map((tweet) => <Tweet key={tweet.tweet} {...tweet} />)
        ) : (
            <p>There's currently no bweet from this user</p>
        );
    // Only show the follow button if we have an account and we're not viewing our own account
    const showFollowButton = props.id !== anchorWallet?.publicKey.toBase58() || !hasAccount;

    return (
        <div className={styles.container}>
            <div className={styles.twitterContainer}>
                <div>
                    <div className={styles.userContainer}>
                        <div className={styles.username}>{username}</div>
                        <div className={styles.userkey}>@{props.id}</div>
                    </div>

                    <div className={styles.button_container}>
                        {showFollowButton && (
                            <button className={`${styles.follow_button} cta-button`} onClick={createFollow} disabled={isFollow}>
                                {isFollow ? "Following" : "Follow"}
                            </button>
                        )}
                        <WalletMultiButton className="button-glow" />
                    </div>
                </div>

                <div className={styles.tweetContainer}>{tweetElements}</div>
            </div>
        </div>
    );
};

export default User;
