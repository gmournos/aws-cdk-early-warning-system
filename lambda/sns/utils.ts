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

export const sendCustomizedAlert = async (subject: string, body: string) => {
    const accountEnvironment = process.env.ACCOUNT_ENVIRONMENT!;
    const topicArn = process.env.TOPIC_ARN!;
    
    const standardSubject = `[EWS ${accountEnvironment.toUpperCase()}] ${subject}`.slice(0, 100); // AWS SNS fails for Subject.length > 100
    const standardBody = `[${accountEnvironment.toUpperCase()}] - EWS Notification - 
    
    ${body}`;

    await sendAlert(standardSubject, standardBody, topicArn);
};