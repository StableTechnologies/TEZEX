import React, { useState } from "react";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import KeyboardArrowDown from "@material-ui/icons/KeyboardArrowDown";
import useStyles from "./style";
import { tokens } from '../../constants';

const TokenSelector = ({label, token, openModal}) => {
    const classes = useStyles();
    const [amount, setAmount] = useState(0);

    const onGetVal = (item) => {
        if(item && !!item.icon) {
            return (
                <>
                    <img className={classes.tokenIcon} src={item.icon} />
                    {item.name}
                </>
            )
        }
        return "Select Token";
    }

    return (
        <div className={classes.root}>
            <Typography color="textSecondary" variant="subtitle2" className={classes.label}>{label}</Typography>
            <div className={classes.bottomContainer}>
                <Button color="primary" onClick={openModal} className={classes.chooseBtn}>
                    {onGetVal(token)}
                    <KeyboardArrowDown style={{ color: "#000" }} />
                </Button>
                <input type={'text'} className={classes.tokeninput} value={amount} onInput={(e) => setAmount(e.target.value || 0)}></input>
            </div>
        </div>
    );

};

export default TokenSelector;