package com.cinebook.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ShowtimeRequest {
    private Long movieId;
    private Long theatreId;
    private String screenName;
    private String showDate;   // "yyyy-MM-dd"
    private String showTime;   // "HH:mm"
    private BigDecimal pricePlatinum;
    private BigDecimal priceGold;
    private BigDecimal priceSilver;
    private Integer rowsCount;
    private Integer colsCount;
}
