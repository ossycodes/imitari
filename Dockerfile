FROM node
MAINTAINER Osaigbovo Emmanuel

ADD imitari/imitari.js /opt/app/imitari.js
ADD imitari/package.json /opt/app/package.json
ADD imitari/settings.json /opt/app/settings.json

WORKDIR /opt/app
RUN npm i

EXPOSE 3000

CMD [ "node", "/opt/app/imitari" ]
