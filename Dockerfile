FROM ubuntu:latest
LABEL authors="pnghu"

ENTRYPOINT ["top", "-b"]