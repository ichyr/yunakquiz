#!/bin/sh
# Runs when LocalStack is ready. LocalStack SES rejects unverified senders.
awslocal ses verify-email-identity --email-address noreply@yunakquiz.test
