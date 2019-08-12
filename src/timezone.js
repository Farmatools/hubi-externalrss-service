module.exports = {
  today() {
      let today = new Date();
      const timeZoneOffset = today.getTimezoneOffset();

      today.setHours(0, 0, 0, 0);
      today.setHours(today.getHours() - timeZoneOffset / 60);
      return today;
  },
  tomorrow() {
      let tomorrow = new Date();
      const timeZoneOffset = tomorrow.getTimezoneOffset();

      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setHours(tomorrow.getHours() - timeZoneOffset / 60);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
  },
  now() {
      let now = new Date();
      const timeZoneOffset = now.getTimezoneOffset();

      now.setHours(now.getHours() - timeZoneOffset / 60);
      return now;
  },
  localDate(date) {
      const timeZoneOffset = date.getTimezoneOffset();

      date.setHours(date.getHours() + timeZoneOffset / 60);
      return date;      
  }
};