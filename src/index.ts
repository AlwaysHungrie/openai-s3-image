// src/index.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  NotFound,
  NoSuchKey,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

// Load environment variables
dotenv.config()

class OpenAIS3Image {
  private s3Client: S3Client
  private BUCKET_NAME: string

  constructor({
    awsRegion,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsS3Bucket,
  }: {
    awsRegion: string
    awsAccessKeyId: string
    awsSecretAccessKey: string
    awsS3Bucket: string
  }) {
    this.s3Client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    })

    this.BUCKET_NAME = awsS3Bucket
  }

  _getImageUrl(imageId: string) {
    return `https://${this.BUCKET_NAME}.s3.amazonaws.com/uploads/${imageId}`
  }

  async uploadPlaceholderImage(imageId: string) {
    const key = `uploads/${imageId}`
    const placeholderFileName = `placeholder.svg`
    const placeholderFileType = 'image/svg+xml'
    const placeholderFilePath = path.join(
      __dirname,
      'public',
      placeholderFileName
    )
    const placeholderFile = fs.readFileSync(placeholderFilePath)

    const command = new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: placeholderFile,
      ContentType: placeholderFileType,
    })

    await this.s3Client.send(command)
    return this._getImageUrl(imageId)
  }

  async getImage(imageId: string) {
    const key = `uploads/${imageId}`

    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    })

    try {
      const response = await this.s3Client.send(command)
      console.log('Response:', response)
      return this._getImageUrl(imageId)
    } catch (error) {
      console.log('Error getting image:', error)

      if (error instanceof NotFound || error instanceof NoSuchKey) {
        const placeholderUrl = await this.uploadPlaceholderImage(imageId)
        return placeholderUrl
      }

      throw error
    }
  }

  async getPresignedUrl(imageId: string) {
    const key = `uploads/${imageId}`

    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    })

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 900,
    })

    return presignedUrl
  }

  async deleteImage(imageId: string) {
    const key = `uploads/${imageId}`

    const command = new DeleteObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    })

    await this.s3Client.send(command)
    return true
  }

  async replaceImage(imageId: string, externalImageUrl: string) {
    try {
      const response = await axios.get(externalImageUrl, {
        responseType: 'arraybuffer',
      })

      const imageBuffer = Buffer.from(response.data)

      const contentType = response.headers['content-type'] || 'image/jpeg'
      const fileName = `${imageId}`
      const key = `uploads/${fileName}`

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
      })

      await this.s3Client.send(command)
      return this._getImageUrl(imageId)
    } catch (error) {
      console.log('Error replacing image:', error)
      throw error
    }
  }
}

export default OpenAIS3Image

// const test = async () => {
//   const openAIS3Image = new OpenAIS3Image({
//     awsRegion: process.env.AWS_REGION || 'ap-south-1',
//     awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
//     awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
//     awsS3Bucket: process.env.AWS_S3_BUCKET || '',
//   })

//   const url = await openAIS3Image.getImage('123')
//   console.log(url)

//   const presignedUrl = await openAIS3Image.getPresignedUrl('123')
//   console.log(presignedUrl)

//   const replacedImage = await openAIS3Image.replaceImage(
//     '123',
//     'https://i.pinimg.com/236x/50/26/92/5026928d9e0104f006e50b274519b5d1.jpg'
//   )
//   console.log(replacedImage)

//   const deleted = await openAIS3Image.deleteImage('123')
//   console.log(deleted)
// }

// test()
