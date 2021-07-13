import React, { useContext } from "react";
import useStyles from "../home/style";
import PropTypes from "prop-types";

import Avatar from "@material-ui/core/Avatar";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from "@material-ui/core/ListItemText";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';


function TokenSelectionDialog(props) {
  const classes = useStyles();

  const { onClose, selectedValue, open, side, lists, content, closeBtn  } = props;

  const handleClose = () => { onClose(selectedValue, side); };

  const handleListItemClick = (value) => { onClose(value, side); };


  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle id="simple-dialog-title">
          {(side === 'input') && ('Select Input Token')}
          {(side === 'output') && ('Select Output Token')}
          {(side === 'wallet') && ('Connect Ethereum Wallet')}
          { closeBtn && (
            <IconButton aria-label="close" onClick={onClose} className={classes.close}>
              <CloseIcon />
            </IconButton>
          )}
      </DialogTitle>
      {content && (
        <DialogContent>
          <DialogContentText> {content} </DialogContentText>
        </DialogContent>
      )}

      <List className={classes.listCon}>
        {Object.entries(lists).map(([key, value]) => (
          <ListItem button onClick={() => handleListItemClick(key)} key={key} className={classes.list}>
            <ListItemIcon className={classes.avatar}>
              <img className={classes.logo} src={value} alt="Logo" />
            </ListItemIcon>
            <ListItemText primary={key} />
          </ListItem>
        ))}
      </List>
    </Dialog>
  );
}

TokenSelectionDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  selectedValue: PropTypes.string.isRequired,
  side: PropTypes.string.isRequired
};

export default TokenSelectionDialog;