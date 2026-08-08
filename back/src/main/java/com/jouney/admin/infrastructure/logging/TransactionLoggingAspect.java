package com.jouney.admin.infrastructure.logging;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Logs every application-layer transaction (each {@code @Service} under {@code application.*}
 * represents one business transaction, typically ending in a persistence write). Kept as a single
 * cross-cutting aspect instead of manual logging in every use case.
 */
@Aspect
@Component
public class TransactionLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger("com.jouney.admin.transaction");

    @Around("within(com.jouney.admin.application..*) && @within(org.springframework.stereotype.Service)")
    public Object logTransaction(ProceedingJoinPoint joinPoint) throws Throwable {
        String signature = joinPoint.getSignature().toShortString();
        long start = System.currentTimeMillis();
        log.info("BEGIN {}", signature);
        try {
            Object result = joinPoint.proceed();
            log.info("COMMIT {} durationMs={}", signature, System.currentTimeMillis() - start);
            return result;
        } catch (Throwable ex) {
            log.warn("ROLLBACK {} durationMs={} error={}", signature, System.currentTimeMillis() - start,
                    ex.toString());
            throw ex;
        }
    }
}
