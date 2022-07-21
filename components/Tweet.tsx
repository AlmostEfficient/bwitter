/* eslint-disable react-hooks/rules-of-hooks */
import React, { FC, useEffect, useState } from "react";
import { timeDifference } from "./util";
import styles from "../styles/Tweet.module.css";

export interface TweetProps {
    tweet: string;
    authorName: string;
    authorKey: string;
    timestamp: number;
}

const Tweet: FC<TweetProps> = (props) => {
    const [counter, setCounter] = useState(Date.now());

    useEffect(() => {
        const timerId = setTimeout(() => {
            setCounter(Date.now());
        }, 1000);

        return () => clearTimeout(timerId);
    }, [counter]);

    return (
        <div className={styles.container}>
            <div className={styles.name_container}>
                <a href={"/" + props.authorKey} className={styles.link}>
                    {props.authorName}
                </a>

                <p>{timeDifference(counter, props.timestamp)}</p>
            </div>

            <div>{props.tweet}</div>
        </div>
    );
};

export default Tweet;
