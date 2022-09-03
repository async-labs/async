### Setup

- [Install](https://serverless.com/framework/docs/providers/aws/guide/installation/) and [setup](https://serverless.com/framework/docs/providers/aws/guide/credentials/) `serverless`.
- Install deps (run `yarn`).
- Create `.env` file. (required configs: `PRODUCTION_URL_APP`, `MONGO_URL_TEST`, `MONGO_URL`, `Amazon_accessKeyId`, `Amazon_secretAccessKey`, `EMAIL_SUPPORT_FROM_ADDRESS`)
- Also you can create `.env.production` file for production deploy.

### Deploy

- Development deploy: Run `sls deploy`
- Production deploy: Run `NODE_ENV=production sls deploy`
- If files did not change: Add `--force`
- Deploy particular function: `NODE_ENV=production sls deploy function --function checkUserInactivity --force`
- invoke locally weeklyStat, only staging MongoDB: `sls invoke local -f weeklyStat -e ONLY_MONGO_URL=1`

### Testing (run/invoking)

- For invoking `checkCardExpiration` locally run `sls invoke local -l -f checkCardExpiration`.
- For invoking `checkCardExpiration` run `sls invoke -l -f checkCardExpiration`.

### Cloudformation

If stack inside Cloudformation is in `UPDATE_ROLLBACK_FAILED` state, it will not recover. You have to delete all associated resources (most likely, lambda functions and S3 buckets), then delete stack, then deploy all lambda functions with `NODE_ENV=production sls deploy`. AWS Cloudformation will create a new stack.

### Create shortcut to folder

```
ln -s /home/timur101/apps/async/private-api /home/timur101/apps/async/lambda/src
```

Syntax for command:
```
ln -s /shortcut-to-folder /location-of-shortcut
```


### CloudFront invalidation of objects

https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-serving-outdated-content-s3/

### Current tasks

- CloudFront for static files
- deploy SSR React app to Lambda@Edge