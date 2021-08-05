import React, { useContext, useState } from "react";
import useStyles from "./style";
import PropTypes from "prop-types";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from "@material-ui/core/ListItemText";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';

import {SearchInput} from '../input/index';
import  { tokens, }  from '../constants/index';



function TokenSelectionDialog(props) {
    const classes = useStyles();
    const [searchList, setSearchList] = useState('');

  const { onClose, handleClick, selectedValue, open, side, lists, isSearch, content,content1, closeBtn,  } = props;

  const handleClose = () => { onClose(selectedValue, side); };

  const search  = lists.filter(data => {

    if(searchList) {
      const isData = data.title.toLowerCase().includes(searchList.toLowerCase()) || data.banner.toLowerCase().includes(searchList.toLowerCase());
      return isData;
    }
    else {
      return data
    }
  })

  const handleListItemClick = (value) => {
    onClose(value, side);
    if(handleClick){
      handleClick(value);
    }
  };

  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle id="simple-dialog-title">
          {(side === 'input') && ('Select Token')}
          {(side === 'output') && ('Select Token')}
          {(side === 'wallet') && ('Connect Ethereum Wallet')}
          {(side === 'err') && ('Connecting to Wallet')}
          { closeBtn && (
            <IconButton aria-label="close" onClick={onClose} className={classes.close}>
              <CloseIcon />
            </IconButton>
          )}
      </DialogTitle>
      {content && (
        <DialogContent>
          <DialogContentText> {content} </DialogContentText>
          {content1}
        </DialogContent>
      )}
     {isSearch && ( <SearchInput
        value= { searchList }
        placeholder= "Search Token"
        onChange= {e => setSearchList(e.target.value)}
      />)}

      {lists && (
      <List className={classes.listCon}>
        {search.map((value, key) => (
          <ListItem button onClick={() => handleListItemClick(value)} key={key} className={classes.list}>
            <ListItemIcon className={classes.avatar}>
              <img className={classes.logo} src={value.logo} alt="Logo" />
            </ListItemIcon>
            <ListItemText
              classes={{
                root: classes.listItem,
                primary: classes.listTitle,
                secondary: classes.listBanner
              }}
              primary={value.title} secondary={value.banner}
            />
          </ListItem>
        ))}
      </List>
      )}
    </Dialog>
  );
}

TokenSelectionDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  // selectedValue: PropTypes.object.isRequired,
  side: PropTypes.string.isRequired
};

export default TokenSelectionDialog;