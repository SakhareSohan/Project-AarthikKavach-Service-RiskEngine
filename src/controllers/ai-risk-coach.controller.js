const AiRiskCoachService = require('../services/ai-risk-coach.service');
const { StatusCodes } = require('http-status-codes');

const chat = async (req, res) => {
    try {
        const { userId, question } = req.body;

        if (!userId || !question) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'userId and question are required',
                data: {},
                error: {}
            });
        }

        const response = await AiRiskCoachService.getChatResponse(userId, question);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully fetched AI response',
            data: {
                response: response
            },
            error: {}
        });
    } catch (error) {
        console.error('Error in chat controller:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Something went wrong',
            data: {},
            error: error
        });
    }
}

const clearChat = (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'userId is required',
                data: {},
                error: {}
            });
        }

        AiRiskCoachService.clearHistory(userId);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Chat history cleared',
            data: {},
            error: {}
        });
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Something went wrong',
            data: {},
            error: error
        });
    }
}

module.exports = {
    chat,
    clearChat
}
