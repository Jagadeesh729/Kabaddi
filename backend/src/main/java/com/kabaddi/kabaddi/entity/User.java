package com.kabaddi.kabaddi.entity;


import com.kabaddi.kabaddi.util.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String name;
    @Indexed(unique = true)
    private String username;
    private String password;
    private String url;
    private String phone;
    private String location;
    private String about;
    private Float height;
    private Float weight;
    private Integer age;
    private LocalDate createdAt;
    private UserRole userRole;
}
