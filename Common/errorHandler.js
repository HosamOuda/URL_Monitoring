const handle_errors = (err) => {
    const error_obj = {};
    if (err.code === 11000) {
      error_obj["msg"] = " Duplicate email ";
      error_obj.status_code = 11000;
    }
  
    if (err.message == "Incorrect password") {
      error_obj["msg"] = err.message;
      error_obj.status_code = 401;
    } else if (err.message == "Incorrect email") {
      error_obj["msg"] = "Your email is not registered in the system";
      error_obj.status_code = 401;
    }
  
    if (err.message.includes("user validation failed")) {
      Object.values(err.errors).forEach(({ properties }) => {
        error_obj[properties.path] = properties.message;
        //console.log("my path " , properties.path , " the message in it " ,properties.message );
      });
      error_obj.status_code = 400;
    }
    return error_obj;
  };