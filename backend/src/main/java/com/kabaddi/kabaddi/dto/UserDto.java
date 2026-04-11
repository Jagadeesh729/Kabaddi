package com.kabaddi.kabaddi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private String id;
    private String name;
    private String username;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;
    private String url;
    private String location;
    private String about;
    private Float height;
    private Float weight;
    private String phone;
    private Integer age;
    private LocalDate createdAt;
}
