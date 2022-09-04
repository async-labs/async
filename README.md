![image](https://user-images.githubusercontent.com/26158226/155850630-137ae3be-aa29-487b-a422-e8fb4db634dc.png)

Support Ukraine: [link](https://bank.gov.ua/en/news/all/natsionalniy-bank-vidkriv-spetsrahunok-dlya-zboru-koshtiv-na-potrebi-armiyi)


## Async

Open source team web application communication web application with two main features. Discussions for async communication and Chats for sync communication.


## Live demo:

- APP: https://1.async-await.com
- API: https://api-xphxggip.async-await.com


## Sponsors

[![aws-activate-logo](https://user-images.githubusercontent.com/26158226/138565715-4311ddda-fb77-452a-8755-d53eb18f8645.png)](https://aws.amazon.com/activate/)

[![1password-logo](https://user-images.githubusercontent.com/26158226/138565841-ad435374-7330-477a-b6f3-2542109c3217.png)](https://1password.com/)


## Contents

- [Features](#features)
- [Run locally](#running-api-locally)
- [Deploy](#deploy-with-heroku)
- [Built with](#built-with)
- [Screenshots](#screenshots)
- [Showcase](#showcase)
- [Contributing](#contributing)
- [Team](#team)


## Features

- Server-side rendering for [fast initial load and SEO](https://async-await.com/article/server-side-vs-client-side-rendering-in-react-apps).
- User authentication with Google OAuth API and Passwordless, cookie, and session.
- Production-ready Express server with compression, parser, and helmet.
- Transactional emails (`AWS SES`): welcome, team invitation, and payment.
- Adding email addresses to newsletter lists (`Mailchimp`): new users, paying users.
- File upload, load, and deletion (`AWS S3`) with pre-signed request for: Posts, Team Profile, and User Profile.
- Websockets with socket.io v3.
- Team creation, Team Member invitation, and settings for Team and User.
- Opinionated architecture:
  - keeping babel and webpack configurations under the hood,
  - striving to minimize number of configurations,
  - `withAuth` HOC to pass user prop and control user access to pages,
  - HOC extensions `MyApp` and `MyDocument`
  - server-side rendering with `Material-UI`,
  - model-specific components in addition to common components.
- Universally-available environmental variables at runtime.
- Custom logger (configure what _not_ to print in production).
- Useful components for any web app: `ActiveLink`, `Confirm`, `Notifier`, `MenuWithLinks`, and more.
- Analytics with `Google Analytics`.
- Production-ready, scalable architecture:
  - `app` - user-facing web app with Next/Express server, responsible for rendering pages (either client-side or server-side rendered). `app` sends requests via API methods to `api` Express server.
  - `api` - server-only code, Express server, responsible for processing requests for internal and external API infrastructures.
  - we prepared both apps for easy deployment to `now` by vercel.
- **Subscriptions with `Stripe`**:
  - subscribe/unsubscribe Team to plan,
  - update card information,
  - verified Stripe webhook for failed payment for subscription.


#### Running `api` locally:

- Before running, create a `.env` file inside the `api` folder with the environmental variables as shown below. These variables are also listed in [`.env.example`](https://github.com/async-labs/saas/blob/master/saas/api/.env.example), which you can use as a template to create your own `.env` file inside the `api` foler.

`api/.env`:

  ```
  # Used in api/server/server.ts
  MONGO_URL_TEST=
  MONGO_URL=
  SESSION_NAME=
  SESSION_SECRET=
  COOKIE_DOMAIN=
  
  # Used in api/server/google.ts
  GOOGLE_CLIENTID=
  GOOGLE_CLIENTSECRET=
  
  # Used in api/server/aws-s3.ts and api/server/aws-ses.ts
  AWS_REGION=
  AWS_ACCESSKEYID=
  AWS_SECRETACCESSKEY=
  
  # Used in api/server/models/Invitation.ts and api/server/models/User.ts
  EMAIL_SUPPORT_FROM_ADDRESS=
  
  # Used in api/server/mailchimp.ts
  MAILCHIMP_API_KEY=
  MAILCHIMP_REGION=
  MAILCHIMP_SAAS_ALL_LIST_ID=
  
  ----------
  # All env variables above this line are needed for successful user signup
  
  # Used in api/server/stripe.ts
  STRIPE_TEST_SECRETKEY=sk_test_xxxxxx
  STRIPE_LIVE_SECRETKEY=sk_live_xxxxxx
  
  STRIPE_TEST_PLANID=plan_xxxxxx
  STRIPE_LIVE_PLANID=plan_xxxxxx
  
  STRIPE_LIVE_ENDPOINTSECRET=whsec_xxxxxx
  
  # Optionally determine the URL
  URL_APP="http://localhost:3000"
  URL_API="http://localhost:8000"
  PRODUCTION_URL_APP="https://saas-app.async-await.com"
  PRODUCTION_URL_API="https://saas-api.async-await.com"
  ```
  
  - Your `.env` file file _must_ have values for the `required` variables. To use all features and third-party integrations, also add the `optional` variables.

  - IMPORTANT: do not publish your actual values for environmentable variables in `.env.example`; this file is public and only meant to show you how your `.env` should look.<br/>
  
  - IMPORTANT: use your values for `PRODUCTION_URL_APP` and `PRODUCTION_URL_API`. These are values for domain name that you own.

  - IMPORTANT: The above environmental variables are available on the server only. You should add your `.env` file to `.gitignore` inside the `api` folder so that your secret keys are not stored on a remote Github repo.

  - To get value for `MONGO_URL_TEST`, we recommend you use a [free MongoDB at MongoDB Atlas](https://docs.atlas.mongodb.com/) or [$15/month MongoDB at Digital Ocean](https://www.digitalocean.com/products/managed-databases-mongodb/)
  - Specify your own name and secret keys for Express session: [SESSION_NAME](https://github.com/expressjs/session#name) and [SESSION_SECRET](https://github.com/expressjs/session#express)
  - Get `GOOGLE_CLIENTID` and `GOOGLE_CLIENTSECRET` by following the [official OAuth tutorial](https://developers.google.com/identity/sign-in/web/sign-in#before_you_begin). <br/>
    Important: For Google OAuth app, callback URL is: http://localhost:8000/oauth2callback <br/>
    Important: You have to enable Google+ API in your Google Cloud Platform account.

- Once `.env` is created, you can run the `api` app. Navigate to the `api` folder, run `yarn install` to add all packages, then run the command below:
  ```
  yarn dev
  ```


#### Running `app` locally:

- Navigate to the `app` folder, run `yarn` to add all packages, then run `yarn dev` and navigate to `http://localhost:3000`:

  - A `.env` file in the `app` folder is not required to run, but you can create one to override the default variables. The environmental variables for `.env` in the `app` folder are shown below. You can also refer [`.env.example`](https://github.com/async-labs/saas/blob/master/saas/app/.env.example) for creating your own `.env` file in the `app` folder.<br/>

  ```
    NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLEKEY="pk_test_xxxxxxxxxxxxxxx"
    NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLEKEY="pk_live_xxxxxxxxxxxxxxx"
    
    NEXT_PUBLIC_BUCKET_FOR_POSTS=
    NEXT_PUBLIC_BUCKET_FOR_TEAM_AVATARS=
    NEXT_PUBLIC_BUCKET_FOR_TEAM_LOGOS=
    
    NEXT_PUBLIC_URL_APP="http://localhost:3000"
    NEXT_PUBLIC_URL_API="http://localhost:8000"
    NEXT_PUBLIC_PRODUCTION_URL_APP=
    NEXT_PUBLIC_PRODUCTION_URL_API=
    
    NEXT_PUBLIC_API_GATEWAY_ENDPOINT=
    NEXT_PUBLIC_GA_MEASUREMENT_ID=
  ```

  - IMPORTANT: do not publish your actual values for environmentable variables in `.env.example`; this file is public and only meant to show you how your `.env` should look.<br/>
  
  - IMPORTANT: use your values for `PRODUCTION_URL_APP` and `PRODUCTION_URL_API`. These are values for domain name that you own.

  - To get `NEXT_PUBLIC_GA_MEASUREMENT_ID`, set up Google Analytics and follow [these instructions](https://support.google.com/analytics/answer/1008080?hl=en) to find your tracking ID.
  - To get `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLEKEY`, go to your Stripe dashboard, click `Developers`, then click `API keys`.

- For successful file uploading, make sure your buckets have proper CORS configuration. Go to your AWS account, find your bucket, go to `Permissions > CORS configuration`, add:

```
[
  {
    "AllowedHeaders":[
      "*"
    ],
    "AllowedMethods":[
      "PUT",
      "POST",
      "GET",
      "HEAD",
      "DELETE"
    ],
    "AllowedOrigins":[
      "http://localhost:3000",
      "https://saas-app.async-await.com"
    ],
    "ExposeHeaders":[
      "ETag",
      "x-amz-meta-custom-header"
    ]
  }
]
```

- Make sure to update allowed origin with your actual values for `NEXT_PUBLIC_URL_APP` and `NEXT_PUBLIC_PRODUCTION_URL_APP`.

- Once `.env` is created, you can run the `app` app. Navigate to the `app` folder, run `yarn install` to add all packages, then run the command below:
  ```
  yarn dev
  ```


#### Symlink `api` in `lambda`:

In lambda directory we are symlinking api directory. You can run symlink command in lambda folder as mentioned below:
```
bash symlink ../api
```

## Deploy to Heroku, AWS Elastic Beanstalk, API Gateway and AWS Lambda

We give detailed instructions inside Chapter 9 and 10 of our SaaS Boilerplate book: https://builderbook.org/book

## Built with

- [React](https://github.com/facebook/react)
- [Material-UI](https://github.com/mui-org/material-ui)
- [Next](https://github.com/vercel/next.js)
- [MobX](https://github.com/mobxjs/mobx)
- [Express](https://github.com/expressjs/express)
- [Mongoose](https://github.com/Automattic/mongoose)
- [MongoDB](https://github.com/mongodb/mongo)
- [Typescript](https://github.com/Microsoft/TypeScript)

For more detail, check `package.json` files in both `app` and `api` folders and project's root.

To customize styles, check [this guide](https://github.com/async-labs/builderbook#add-your-own-styles).


## Screenshots

Chat for synchronous, urgent communication:<br>
<kbd>![chat-desktop](https://d2c24pn6pcl4ug.cloudfront.net/images/chat-desktop.png)</kbd>

Chat on mobile browser:<br>
<kbd><img height="700" src=https://d2c24pn6pcl4ug.cloudfront.net/images/chat-mobile.jpeg>

Discussion for asynchronous, non-urgent communication:
<kbd>![discussion](https://d2c24pn6pcl4ug.cloudfront.net/images/discussions.png)</kbd>

Discussions consist of Comments, where you can write with Markdown, preview your content, and include attachments.
<kbd>![comment](https://d2c24pn6pcl4ug.cloudfront.net/images/comment.png)</kbd>

Multiple team management demonstrated by team switcher:
<kbd>![team-switcher](https://d2c24pn6pcl4ug.cloudfront.net/images/teamswitcher2.png)</kbd>

User settings:
<kbd>![user-settings](https://d2c24pn6pcl4ug.cloudfront.net/images/account-settings.png)</kbd>

Team settings:
<kbd>![team-settings](https://d2c24pn6pcl4ug.cloudfront.net/images/team-settings.png)</kbd>

Billing:
<kbd>![billing](https://d2c24pn6pcl4ug.cloudfront.net/images/billing.png)</kbd>


## Contributing

Want to support this project? Consider buying our [books](https://builderbook.org/). If you represent company, consider becoming a recurring sponsor for this repo. Our two most popular repos get >1000 unique visitor per week, mostly comprised of people who are building their SaaS web applications.


## Team

- [Kelly Burke](https://github.com/klyburke)
- [Timur Zhiyentayev](https://github.com/tima101)

You can contact us at team@builderbook.org

If you are interested in working with us, check out [Async Labs](https://async-labs.com/).


## License

All code in this repository is provided under the [MIT License](https://github.com/async-labs/async/blob/master/LICENSE.md).

## Project structure

```
├── .elasticbeanstalk
│   └── config.yml
├── .github
│   └── FUNDING.yml
├── .vscode
│   ├── extensions.json
│   ├── launch.json
│   └── settings.json
├── api
│   ├── .elasticbeanstalk
│   │   └── config.yml
│   ├── server
│   │   ├── api
│   │   │   ├── index.ts
│   │   │   ├── public.ts
│   │   │   ├── team-leader.ts
│   │   │   └── team-member.ts
│   │   ├── models
│   │   │   ├── Discussion.ts
│   │   │   ├── EmailTemplate.ts
│   │   │   ├── Invitation.ts
│   │   │   ├── Post.ts
│   │   │   ├── Team.ts
│   │   │   └── User.ts
│   │   ├── utils
│   │   │   ├── slugify.ts
│   │   │   └── sum.ts
│   │   ├── aws-s3.ts
│   │   ├── aws-ses.ts
│   │   ├── google-auth.ts
│   │   ├── logger.ts
│   │   ├── mailchimp.ts
│   │   ├── passwordless-auth.ts
│   │   ├── passwordless-token-mongostore.ts
│   │   ├── server.ts
│   │   ├── sockets.ts
│   │   └── stripe.ts
│   ├── static
│   │   └── robots.txt
│   ├── test/server/utils
│   │   ├── slugify.test.ts
│   │   └── sum.test.ts
│   ├── .eslintignore
│   ├── .eslintrc.js
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.server.json
│   └── yarn.lock
├── app
│   ├── .elasticbeanstalk
│   │   └── config.yml
│   ├── components
│   │   ├── common
│   │   │   ├── Confirmer.tsx
│   │   │   ├── LoginButton.tsx
│   │   │   ├── MemberChooser.tsx
│   │   │   ├── MenuWithLinks.tsx
│   │   │   ├── MenuWithMenuItems.tsx
│   │   │   └── Notifier.tsx
│   │   ├── discussions
│   │   │   ├── CreateDiscussionForm.tsx
│   │   │   ├── DiscussionActionMenu.tsx
│   │   │   ├── DiscussionList.tsx
│   │   │   ├── DiscussionListItem.tsx
│   │   │   └── EditDiscussionForm.tsx
│   │   ├── layout
│   │   │   ├── index.tsx
│   │   ├── posts
│   │   │   ├── PostContent.tsx
│   │   │   ├── PostDetail.tsx
│   │   │   ├── PostEditor.tsx
│   │   │   └── PostForm.tsx
│   │   ├── teams
│   │   │   └── InviteMember.tsx
│   ├── lib
│   │   ├── api
│   │   │   ├── makeQueryString.ts
│   │   │   ├── public.ts
│   │   │   ├── sendRequestAndGetResponse.ts
│   │   │   ├── team-leader.ts
│   │   │   └── team-member.ts
│   │   ├── store
│   │   │   ├── discussion.ts
│   │   │   ├── index.ts
│   │   │   ├── invitation.ts
│   │   │   ├── post.ts
│   │   │   ├── team.ts
│   │   │   └── user.ts
│   │   ├── confirm.ts
│   │   ├── isMobile.ts
│   │   ├── notify.ts
│   │   ├── resizeImage.ts
│   │   ├── sharedStyles.ts
│   │   ├── theme.ts
│   │   └── withAuth.tsx
│   ├── pages
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── billing.tsx
│   │   ├── create-team.tsx
│   │   ├── discussion.tsx
│   │   ├── invitation.tsx
│   │   ├── login-cached.tsx
│   │   ├── login.tsx
│   │   ├── team-settings.tsx
│   │   └── your-settings.tsx
│   ├── public
│   │   └── pepe.jpg
│   ├── server
│   │   ├── robots.txt
│   │   ├── routesWithCache.ts
│   │   ├── server.ts
│   │   └── setupSitemapAndRobots.ts
│   ├── .babelrc
│   ├── .eslintignore
│   ├── .eslintrc.js
│   ├── .gitignore
│   ├── next.env.d.ts
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.server.json
│   └── yarn.lock
├── book
├── lambda
│   ├── .estlintignore
│   ├── .eslintrc.js
│   ├── .gitignore
│   ├── api
│   ├── handler.ts
│   ├── package.json
│   ├── serverless.yml
│   ├── tsconfig.json
│   └── yarn.lock
├── .gitignore
├── LICENSE.md
├── README.md
├── package.json
├── yarn.lock
```
