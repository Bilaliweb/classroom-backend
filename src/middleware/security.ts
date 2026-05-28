import { Request, Response, NextFunction } from "express";
import aj from "../config/arcjet";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";

const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // For test environment just skip the middleware
    if (process.env.NODE_ENV === 'test') return next();

    try {
        // We are creating rate limit role cuz we are about to validate every request and assign a role for better protection
        const role: RateLimitRole = req.user?.role ?? 'guest';

        let limit;
        let message;

        switch (role) {
            case 'admin':
                limit = 20
                message = 'Admin request limit 20 exceeded. Please wait'
                break;
            
            case 'teacher':
                limit = 15
                message = 'Teacher request limit 15 exceeded. Please wait'
                break;

            case 'student':
                limit = 10
                message = 'Student request limit 10 exceeded. Please wait'
                break;

            default:
                limit = 5
                message = 'User request limit 5 exceeded. Please sign up for more requests.'
        }

        const client = aj.withRule(
            slidingWindow({
                mode: 'LIVE',
                interval: '1m',
                max: limit
            })
        )

        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: { remoteAddress: req.socket.remoteAddress ?? req.ip ?? '0.0.0.0'}
        }

        // Decision can be made now
        const decision = await client.protect(arcjetRequest)

        // Responses based on different reasons
        if(decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Automated requests are not allowed' })
        }
        if(decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Request blocked by security policy' })
        }
        if(decision.isDenied() && decision.reason.isRateLimit()) {
            // Status 429 is standard code for too many requests
            return res.status(429).json({ error: 'Too Many Requests', message })
        }

        // If validations are successful, middleware can approve to go to next steps
        next();

    } catch (error) {
        console.log("Arcjet middleware error: ", error);
        res.send(500).json({error: 'Internal Error', message: 'Something went wrong with security middleware'})
    }
}

export default securityMiddleware;