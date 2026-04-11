package com.kabaddi.kabaddi.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateRequestUserDto {
    @NotBlank(message = "name is required")
    @Size(min = 3, message = "User name must be minimum  3 character")
    private String name;
    @NotBlank(message = "username is required")
    private String username;
    private String password;

    private MultipartFile image;
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    @NotBlank(message = "Location cannot be blank")
    private String location;
    @Size(max = 150)
    private String about;
    @Max(value = 300, message = " Cant greater than 300")
    @Min(value = 0, message = "cant less than 0")
    private Float height;
    @Min(value = 0, message = "must be greater than 0")
    private Float weight;
    @NotNull(message = "age required")
    private Integer age;

}
