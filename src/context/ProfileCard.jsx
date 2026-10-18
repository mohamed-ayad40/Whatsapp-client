import React from "react";

export default function ProfileCard({ userName, avatarUrl }) {
  return (
    <>
      <CardHeader>
        <Avatar imageUrl="/img.png" />
        <UserInfo name="Mohamed" title="Software Engineer" />
      </CardHeader>

      <CardBody>
        <Bio text="Building awesome web apps." />
      </CardBody>

      <CardActions>
        <Button>Follow</Button>
        <Button>Message</Button>
      </CardActions>
    </>
  );
}
