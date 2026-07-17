package com.cinebook.dto;

import com.cinebook.entity.Showtime;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ShowtimeResponse {
    private Long id;
    private Long movieId;
    private Long theatreId;
    private MovieResponse movie;
    private TheatreResponse theatre;
    private String screenName;
    private String showDate;
    private String showTime;
    private BigDecimal pricePlatinum;
    private BigDecimal priceGold;
    private BigDecimal priceSilver;
    private Integer rowsCount;
    private Integer colsCount;
    private LocalDateTime createdAt;

    public static ShowtimeResponse from(Showtime s) {
        ShowtimeResponse r = new ShowtimeResponse();
        r.id = s.getId();
        r.movieId = s.getMovie().getId();
        r.theatreId = s.getTheatre().getId();
        r.movie = MovieResponse.from(s.getMovie());
        r.theatre = TheatreResponse.from(s.getTheatre());
        r.screenName = s.getScreenName();
        r.showDate = s.getShowDate().toString();
        r.showTime = s.getShowTime().toString();
        r.pricePlatinum = s.getPricePlatinum();
        r.priceGold = s.getPriceGold();
        r.priceSilver = s.getPriceSilver();
        r.rowsCount = s.getRowsCount();
        r.colsCount = s.getColsCount();
        r.createdAt = s.getCreatedAt();
        return r;
    }
}
