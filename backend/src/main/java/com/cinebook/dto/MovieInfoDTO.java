package com.cinebook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieInfoDTO {
    private String title;
    private String releaseDate;
    private List<String> cast;
    private String director;
    private Long budget;
    private Long revenue;
    private Double imdbRating;
    private String plot;
    private String posterUrl;
}
