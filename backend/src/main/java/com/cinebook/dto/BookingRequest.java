package com.cinebook.dto;

import lombok.Data;
import java.util.List;

@Data
public class BookingRequest {
    private Long showtimeId;
    private List<String> seats;
    private Double totalAmount;
}
