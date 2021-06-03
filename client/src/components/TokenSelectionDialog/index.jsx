import React, { useState } from "react";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from "@material-ui/core/ListItemText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Typography from "@material-ui/core/Typography";
import PropTypes from "prop-types";
import SearchInput from '../SearchInput';
import useStyles from "./style";
import { tokens } from '../../constants';

function TokenSelectionDialog(props) {
    const classes = useStyles();
  
    const { selectedValue, open, side, onClose, onSelect } = props;
    const [searchTxt, setSearchTxt] = useState('');
  
    const handleClose = () => { onClose(selectedValue, side); };
  
    const handleListItemClick = (value) => { 
        onSelect(value, side); 
    };

    const filteredTokens = tokens.filter(item => {
        if (!searchTxt) {
            return item;
        }
        const mainSearchTxt = searchTxt.toLowerCase();
        const isIncluded = item.name.toLowerCase().includes(mainSearchTxt) || item.subTitle.toLowerCase().includes(mainSearchTxt);
        return isIncluded && item;
    });
  
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            classes={{
                paper: classes.container
            }}
            aria-labelledby="simple-dialog-title"
        >
            <DialogTitle id="simple-dialog-title">
                <Typography className={classes.title}>Select {side} Token</Typography>
                <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <div className={classes.searchContainer}>
                <SearchInput
                    placeholder='Search Token'
                    value={searchTxt}
                    onChange={val => setSearchTxt(val)}
                />
            </div>
            
            <List className={classes.listContainer}>
                {filteredTokens.map((item, index) => (
                    <ListItem
                        key={index}
                        className={classes.listItem}
                        button
                        selected={selectedValue && item.name === selectedValue.name}
                        onClick={() => handleListItemClick(item)}
                    >
                        <ListItemIcon>
                            <img className={classes.icon} src={item.icon} alt="Logo" />
                        </ListItemIcon>
                        <ListItemText
                            classes={{
                                root: classes.listItemTxt,
                                primary: classes.primaryTxt,
                                secondary: classes.secondTxt
                            }}
                            primary={item.name}
                            secondary={item.subTitle}
                        />
                    </ListItem>
                ))}
            </List>
        </Dialog>
    );
}

TokenSelectionDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    selectedValue: PropTypes.string.isRequired,
    side: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
};

export default TokenSelectionDialog;