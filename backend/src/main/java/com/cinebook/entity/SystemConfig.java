package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfig {

    @Id
    @Column(name = "config_key")
    private String key;

    @Column(name = "config_value", nullable = false)
    private String value;
}
