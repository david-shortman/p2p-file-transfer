FROM node
COPY . .
RUN npm i
ARG PORT
EXPOSE ${PORT}
CMD ["node", "Server.js"]