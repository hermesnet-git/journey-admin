package com.jouney.admin.interfaces;

import java.time.OffsetDateTime;
import java.util.List;

public record ApiError(OffsetDateTime timestamp, int status, String code, String message, String path,
                        List<ApiErrorDetail> details) {

    public record ApiErrorDetail(String field, String code, String message) {
    }
}
