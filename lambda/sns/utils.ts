import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient();

const sendAlert = async (subject: string, body: string, destinationTopicArn: string) => {

    const message = {
        Subject: subject,
        Message: body,
        TopicArn: destinationTopicArn,
    };

    console.debug('message to send', message);

    try {
        await snsClient.send(new PublishCommand(message));
        console.debug('Message sent successfully');
        return { statusCode: 200, body: 'Message sent successfully' };
    } catch (error) {
        console.error('Error sending message:', error, message);
        return { statusCode: 500, body: 'Error sending message' };
    }
};