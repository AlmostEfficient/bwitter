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
