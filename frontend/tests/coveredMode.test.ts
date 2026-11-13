import assert from "node:assert/strict";
import test from "node:test";
import { needsReview } from "../src/lib/types.ts";

test("covered-face results stay in the lecturer's review queue without an invented face score",()=>{
    assert.equal(needsReview({facial_score:null,cheat_report:"[MANUAL REVIEW REQUIRED] Covered-face voice verification"}),true);
    assert.equal(needsReview({facial_score:90,cheat_report:"Normal checks"}),false);
});
