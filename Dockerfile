FROM node

RUN mkdir /app
WORKDIR /app
COPY ./package.json ./
COPY ./package-lock.json ./
RUN npm install
RUN npm install -g node-dev
RUN echo "DUPA" > node_modules/foo.txt

