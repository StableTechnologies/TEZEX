import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    // width: 376,
  },
  container: {
    width: 376,
    borderRadius: 24,
    paddingTop: 8,
  },
  searchContainer: {
    padding: '0 16px'
  },
  listContainer: {
    height: 230,
    padding: '24px 0 20px 0'
  },
  listItem: {
    padding: '5px 16px 5px 28px',
    fontFamily: 'Inter'
  },
  listItemTxt: {
    margin: 0
  },
  primaryTxt: {
    lineHeight: '19px',
    fontWeight: 500,
    fontSize: 16
  },
  secondTxt: {
    lineHeight: '17px',
    fontWeight: 300,
    fontSize: 14
  },
  icon: {
    width: 32,
    height: 32,
  },
  title: {
    fontWeight: 600,
    fontSize: 16,
    lineHeight: '19px',
    fontFamily: 'Inter'
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1)
  },
  
}));

export default useStyles;
