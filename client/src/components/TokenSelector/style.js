import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: "#F8F8F8",
    borderRadius: '8px',
    padding: '15px 17px 15px 16px'
  },
  bottomContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10

  },
  tokeninput: {
    border: "0",
    width: 100,
    textAlign: 'right',
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 24,
    backgroundColor: 'transparent',
    color: '#C4C4C4'
  },
  chooseBtn: {
    padding: 0,
    minWidth: 0,
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 18,
    color: '#000000',
    textTransform: 'initial',
  },
  tokenIcon: {
    marginRight: 8,
    height: 24,
    width: 24
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '17px'
  }
  
}));

export default useStyles;
