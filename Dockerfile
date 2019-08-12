FROM node:alpine

ARG DEPLOY_ENV=production
RUN mkdir /opt/hubi-externalrss-service

ADD ./src /opt/hubi-externalrss-service/src

ADD ./hubi-logging /opt/hubi-externalrss-service/hubi-logging

ADD ./env/${DEPLOY_ENV}.env /opt/hubi-externalrss-service/app.env
ADD ./package-lock.json /opt/hubi-externalrss-service
ADD ./package.json /opt/hubi-externalrss-service

#Add timezone to dockerfile
RUN apk add --no-cache tzdata
ENV TZ Europe/Helsinki
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /opt/hubi-externalrss-service

RUN npm ci
CMD npm run start