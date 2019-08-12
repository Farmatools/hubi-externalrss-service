/* eslint-disable no-unused-vars */
require('dotenv').config({
  path: "./app.env"
});
const axios = require("axios");
const CronJob = require("cron").CronJob;
const TimeZone = require("./timezone");
const tough = require("tough-cookie");
const Cookie = tough.Cookie;
const cookiejar = new tough.CookieJar();
const Parser = require("rss-parser");
const parser = new Parser();
const Logger = require("hubi-logging");
const Crypto = require("./crypto.js");
const fs = require("fs");

//API URL DEFINITION
const baseUrl = process.env.BASE_URL;
const loginurl = "/api/v1/login";
const noticeurl = "/api/v1/notice";
const userurl = "/api/v1/user";
const companyurl = "/api/v1/company";

//FILENAME
const serviceAccountPath = "./configs/service-accounts.json";
const externalSourcesPath = "./configs/externalsources.json";


//FIXME: Use dotenv here...
const userObj = {
  username: process.env.ADMIN_USR,
  password: process.env.ADMIN_PW
};

//Initial account creation
const init = async () => {
  if (!fs.existsSync(serviceAccountPath) && process.env.INITIAL_CREATE === 'true') {
    Logger.warn("Accounts file not present. Creating new accounts...");
    let sources = fs.readFileSync(externalSourcesPath);
    sources = JSON.parse(sources);

    await login(userObj);
    let serviceaccounts = [];

    for (let source of sources) {
      serviceaccounts.push(await doUser(source));
    }

    serviceaccounts = JSON.stringify(serviceaccounts);
    fs.writeFileSync(serviceAccountPath, serviceaccounts);
  }

  if (fs.existsSync(serviceAccountPath)) {

    let serviceaccounts = fs.readFileSync(serviceAccountPath);
    serviceaccounts = JSON.parse(serviceaccounts);

    for (let account of serviceaccounts) {
      let logindata = {
        username: account.username,
        password: account.password
      };

      await login(logindata);
      await createNotices(account);
    }
  } else {
    Logger.warn("No service accounts file found and initial create has been set to off.");
  }
};

const doCompany = async name => {
  try {
    const response = await axios.get(baseUrl + companyurl);
    const found = response.data.find(item => item.name === name);
    if (found) {
      return found;
    } else {
      let company = {
        name
      };

      //Create the company if it does not exist.
      const response = await axios.post(baseUrl + companyurl, company);
      if (response.status === 201) {
        Logger.info(`Created new company: ${name}`);
        return company;
      }
    }
  } catch (err) {
    Logger.error(err);
  }
};

const doUser = async source => {
  try {
    const response = await axios.get(baseUrl + userurl);
    const found = response.data.find(
      item => item.username === buildServiceAccountName(source.name)
    );
    if (found) {
      return found;
    } else {
      //Get company for user
      let foundcompany = await doCompany(source.company);

      let user = {
        username: buildServiceAccountName(source.name),
        password: Crypto.createHash(source.name),
        name: source.name, //FIXME: Make secure before deployment
        email: source.source,
        role: "publisher",
        company: foundcompany.name,
        categories: source.categories
      };

      const response = await axios.post(baseUrl + userurl, user);
      if (response.status === 200) {
        Logger.info(`Created new user: ${user.username}`);
        return user;
      }
    }
  } catch (err) {
    Logger.error(err);
  }
};

const getAllNotices = async () => {
  const response = await axios.get(`${baseUrl}${noticeurl}?order=newest`);
  return response.data.items;
};

const createNotices = async (source) => {
  const existingnotices = await getAllNotices();
  let feed = await parser.parseURL(source.email);
  //load some notices

  feed.items.forEach(async item => {

    let notice = {
      title: buildTitle(item.title, source.name),
      categories: source.categories,
      description: buildDescription(item.link, item.title),
      activationDate: TimeZone.today(),
      expirationDate: "",
      archiveDate: "",
      deliverToAll: 1,
      products: [],
      files: [],
      requireAck: 0,
      requireAuth: false
    };

    //Set archival to 5 years after release and expiration to 1 year after release
    let expirationDate = new Date(item.isoDate);
    let archiveDate = new Date(item.isoDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    archiveDate.setFullYear(archiveDate.getFullYear() + 5);

    //Consider only the past 2 days of notices for save
    let cacheDate = new Date();
    cacheDate.setDate(cacheDate.getDate() - 2);

    if (cacheDate < new Date(item.isoDate)) {
      notice.archiveDate = archiveDate.toISOString();
      notice.expirationDate = expirationDate.toISOString();
      notice.description = buildDescription(item.link, item.title);
      if (!existingnotices.some(notice => notice.description === buildDescription(item.link, item.title))) {
        const response = await axios.post(baseUrl + noticeurl, notice);
        if (response.status == 201) {
          Logger.info(`Uusi tiedote luotu: ${notice.title}`);
        }
      }
    }
  });
};

const login = async logindata => {
  try {
    const login = await axios.post(baseUrl + loginurl, logindata, {
      maxRedirects: 0,
      validateStatus: code => (code = 302)
    });
    const authorize = await axios.get(baseUrl + login.headers.location, {
      maxRedirects: 0,
      validateStatus: code => (code = 302)
    });
    const authenticate = await axios.get(baseUrl + authorize.headers.location, {
      maxRedirects: 0,
      validateStatus: code => (code = 302)
    });

    Logger.info(`Successfully logged in as ${logindata.username}`);
  } catch (error) {
    Logger.error(error);
  }
};

//Capture cookies from login
axios.interceptors.request.use(function(config) {
  cookiejar.getCookies(config.url, function(err, cookies) {
    config.headers.cookie = cookies.join("; ");
  });
  return config;
});

axios.interceptors.response.use(function(response) {
  if (response.headers["set-cookie"] instanceof Array) {
    let cookies = response.headers["set-cookie"].forEach(function(c) {
      cookiejar.setCookie(Cookie.parse(c), response.config.url, function(
        err,
        cookie
      ) {});
    });
  }
  return response;
});

const buildDescription = (link, description) => {
  return `${description}\n${link}`;
};

const buildTitle = (title, name) => {
  return `${name}: ${title}`;
}
const buildServiceAccountName = name => {
  return name.replace(/[^A-Z0-9]+/gi, "-").toLowerCase() + "-rss-account";
};

//Start the job
let job = new CronJob({
  cronTime: '*/15 * * * *',
  onTick: async () => {
    Logger.info("-- JOB STARTED --");
    await init();
    Logger.info("-- JOB FINISHED --");
  },
  start: true,
  runOnInit: true
});