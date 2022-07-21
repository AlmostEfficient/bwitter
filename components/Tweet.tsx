/* eslint-disable react-hooks/rules-of-hooks */
import React, { FC } from 'react';

import styles from '../styles/Tweet.module.css';

export interface TweetProps {
	tweet: string,
	authorName: string,
	authorKey: string,
	timestamp: number
}

const Tweet: FC<TweetProps> = (props) => {  
 	return (
		<div className={styles.container}> 
			<div><a href={"/" + props.authorKey} className={styles.link}>{props.authorName}</a></div>
			<div>{props.tweet}</div>
		</div>
  	)
}

export default Tweet