import 'source-map-support/register'
import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import {createLogger} from '../../utils/logger'
import { getUserId } from '../utils'
import { TodoAccess } from '../../helpers/todosAcess'


const XAWS = AWSXRay.captureAWS(AWS)
const logger = createLogger('generateUploadUrl')
const s3 = new XAWS.S3({
  signatureVersion: 'v4'
})
const bucketName = process.env.S3_BUCKET
const urlExpiration = +process.env.SIGNED_URL_EXPIRATION
const todoAccess = new TodoAccess()

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const todoId = event.pathParameters.todoId
    logger.info(`Generating upload URL for ${todoId}`)
    const userId = getUserId(event)
    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: todoId,
      Expires: urlExpiration
    })
    logger.info(`Generating upload URL sucessfully ${todoId}, ${uploadUrl}`)
    await todoAccess.saveImgUrl(userId, todoId, bucketName)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        uploadUrl: uploadUrl
      })
    }
  }
)

handler
  .use(httpErrorHandler())
  .use(
    cors({
      credentials: true
    })
  )
