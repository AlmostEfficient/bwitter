import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React, { FC, useState, useEffect } from "react";

import Feed from "./Feed";
import SignUp from "./SignUp";
import styles from "../styles/Home.module.css";
import { getProgram, getStateAccount } from "./util";

const Main: FC = () => {
    const anchorWallet = useAnchorWallet();
    const [hasAccount, setHasAccount] = useState(false);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (anchorWallet) {
            showLoginPage();
            setConnected(true);
        } else {
            setConnected(false);
        }
    }, [anchorWallet]);

    async function showLoginPage() {
        if (!anchorWallet) {
            throw "Something went wrong, wallet is null";
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
            <div className={`${styles.logoContainer}`}>
                <img src="buildspace.png" className={styles.buildspace_logo} />
            </div>

            <div className={styles.registerContainer}>
                <h1 className={styles.site_header}>Join Bwitter today!</h1>
                <WalletMultiButton className="button-glow" />
                <div className={styles.connect_text}>
                    {connected ? hasAccount ? <Feed /> : <SignUp onSubmit={submitSuccessful} /> : "Please connect your wallet"}
                </div>
            </div>
        </div>
    );
};

export default Main;
