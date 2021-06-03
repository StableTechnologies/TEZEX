import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import SearchIcon from '@material-ui/icons/Search';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    border: '1px solid #61A9FD',
    boxShadow: 'none'
  },
  input: {
    flex: 1,
  },
  iconButton: {
    padding: '8px 6px',
    color: '#C4C4C4'
  }
}));

export default function CustomizedInputBase({placeholder, value, onChange}) {
  const classes = useStyles();

  return (
    <Paper className={classes.root}>
      <IconButton className={classes.iconButton} aria-label="search">
        <SearchIcon />
      </IconButton>
      <InputBase
        className={classes.input}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </Paper>
  );
}