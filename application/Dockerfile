FROM node:17

# Create app directory
WORKDIR /app

COPY ./ ./
#COPY ./dist ./views


RUN rm -rf node_modules/
RUN npm cache clear --force
RUN npm install --legacy-peer-deps
RUN npm install -g nodemon
#COPY --from=build-frontend /app/dist ./views

ENV Env prod

EXPOSE 8080
CMD nodemon ./index.js