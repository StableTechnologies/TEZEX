const timer= (timeout) => {

  const endDate = new Date(timeout * 1000).getTime();

    const present = new Date().getTime();

    const timeDiff = endDate - present;

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    let output = hours + " hour " + minutes + " minutes ";
    if(hours <= 0) {
      output =  minutes + " minutes ";
    }

    if(timeDiff < 0) {
      return undefined;
    }
    return output;

}
export default timer;
