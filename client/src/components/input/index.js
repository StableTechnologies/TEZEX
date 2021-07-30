import React from 'react';
import useStyles from "./style";

import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import SearchIcon from '@material-ui/icons/Search';


export const SearchInput = (props) => {
  const classes = useStyles();
  const { placeholder, value, onChange, } = props;

  return (
    <Paper classes={{ root: classes.paper}}>
      <IconButton className={classes.iconButton} aria-label="search">
        <SearchIcon />
      </IconButton>
      <InputBase
        className={classes.input}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
    </Paper>
  );
}
